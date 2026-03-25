/**
 * ChainWatch Telegram Bot
 *
 * Three services in one process:
 * 1. HTTP server       — keep-alive for cron-job.org + /api/link endpoint
 * 2. Telegram bot      — polling mode, handles /start /link /unlink /status
 * 3. Blockchain listener — ethers WSS for AlertTriggered events
 */

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const TelegramBot = require("node-telegram-bot-api");
const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

// ─── Config ──────────────────────────────────────────────────

const {
    TELEGRAM_BOT_TOKEN,
    SOMNIA_WSS,
    SOMNIA_RPC,
    ALERT_HANDLER_ADDRESS,
    ALERT_REGISTRY_ADDRESS,
    FRONTEND_URL = "https://somnia-chainwatch.vercel.app",
    PORT = 3000,
} = process.env;

if (!TELEGRAM_BOT_TOKEN || !SOMNIA_WSS || !ALERT_HANDLER_ADDRESS || !ALERT_REGISTRY_ADDRESS) {
    console.error("❌ Missing required env vars. See .env.example");
    process.exit(1);
}

const EXPLORER_BASE = "https://shannon-explorer.somnia.network";

// Token metadata for human-readable messages
const KNOWN_TOKENS = {
    "0x4a3bc48c156384f9564fd65a53a2f3d534d8f2b7": { symbol: "WSTT", decimals: 18 },
    "0xe9cc37904875b459fa5d0fe37680d36f1ed55e38": { symbol: "USDC", decimals: 6 },
    "0xd2480162aa7f02ead7bf4c127465446150d58452": { symbol: "WETH", decimals: 18 },
};

// AlertTriggered event ABI
const ALERT_HANDLER_ABI = [
    "event AlertTriggered(address indexed tokenAddress, address indexed from, address indexed to, uint256 amount, uint256 blockNumber, uint256 timestamp)",
];

// AlertRegistry read functions
const ALERT_REGISTRY_ABI = [
    "function alertCount() view returns (uint256)",
    "function getAlert(uint256 alertId) view returns (tuple(uint256 id, address owner, address watchAddress, address tokenAddress, uint256 threshold, uint256 subscriptionId, bool active, uint256 createdAt))",
    "function getAlertsByOwner(address owner) view returns (uint256[])",
];

// ─── Data Storage ────────────────────────────────────────────

const DATA_DIR = path.join(__dirname, "data");
const MAPPINGS_FILE = path.join(DATA_DIR, "mappings.json");

if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

/** mappings: { [walletAddress_lowercase]: { chatId, linkedAt } } */
function loadMappings() {
    try {
        if (fs.existsSync(MAPPINGS_FILE)) {
            return JSON.parse(fs.readFileSync(MAPPINGS_FILE, "utf-8"));
        }
    } catch (e) {
        console.error("⚠️ Failed to load mappings, starting fresh:", e.message);
    }
    return {};
}

function saveMappings(mappings) {
    fs.writeFileSync(MAPPINGS_FILE, JSON.stringify(mappings, null, 2));
}

let walletMappings = loadMappings();

/** pendingLinks: { [code]: { wallet, createdAt } } — codes expire after 10 minutes */
const pendingLinks = {};

function cleanExpiredLinks() {
    const now = Date.now();
    for (const code of Object.keys(pendingLinks)) {
        if (now - pendingLinks[code].createdAt > 10 * 60 * 1000) {
            delete pendingLinks[code];
        }
    }
}

// Clean expired links every minute
setInterval(cleanExpiredLinks, 60 * 1000);

// ─── Helpers ─────────────────────────────────────────────────

function getWalletsByChatId(chatId) {
    return Object.entries(walletMappings)
        .filter(([, data]) => data.chatId === chatId)
        .map(([wallet]) => wallet);
}

function getTokenInfo(address) {
    return KNOWN_TOKENS[address.toLowerCase()] || { symbol: "Unknown", decimals: 18 };
}

function formatAmount(amount, decimals) {
    return parseFloat(ethers.formatUnits(amount, decimals));
}

function shortAddr(addr) {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

// ─── 1. HTTP Server (keep-alive + API) ───────────────────────

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.json({
        status: "alive",
        uptime: process.uptime(),
        linkedWallets: Object.keys(walletMappings).length,
        pendingLinks: Object.keys(pendingLinks).length,
    });
});

app.get("/health", (req, res) => {
    res.json({ status: "ok" });
});

// Frontend calls this to register a pending linking code
app.post("/api/link", (req, res) => {
    const { code, wallet } = req.body;
    if (!code || !wallet) {
        return res.status(400).json({ error: "Missing code or wallet" });
    }
    const normalizedWallet = wallet.toLowerCase();
    pendingLinks[code.toUpperCase()] = { wallet: normalizedWallet, createdAt: Date.now() };
    console.log(`📎 Pending link: ${code} → ${normalizedWallet}`);
    res.json({ success: true, expiresIn: "10 minutes" });
});

// ── Telegram Mini App: 1-click secure auto-link ──────────────────
// Verifies the initData HMAC signature so only genuine TMA users can link.
const crypto = require("crypto");

function verifyTelegramInitData(initData) {
    const parsed = new URLSearchParams(initData);
    const hash = parsed.get("hash");
    if (!hash) return null;

    parsed.delete("hash");
    const dataCheckString = Array.from(parsed.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}=${v}`)
        .join("\n");

    const secretKey = crypto
        .createHmac("sha256", "WebAppData")
        .update(TELEGRAM_BOT_TOKEN)
        .digest();

    const expectedHash = crypto
        .createHmac("sha256", secretKey)
        .update(dataCheckString)
        .digest("hex");

    if (expectedHash !== hash) return null;

    const userStr = parsed.get("user");
    if (!userStr) return null;
    try {
        return JSON.parse(userStr); // { id, first_name, username, ... }
    } catch {
        return null;
    }
}

app.post("/api/link-tma", async (req, res) => {
    const { walletAddress, initData } = req.body;
    if (!walletAddress || !initData) {
        return res.status(400).json({ error: "Missing walletAddress or initData" });
    }

    const user = verifyTelegramInitData(initData);
    if (!user) {
        return res.status(401).json({ error: "Invalid or tampered initData" });
    }

    const normalizedWallet = walletAddress.toLowerCase();
    const chatId = user.id;

    walletMappings[normalizedWallet] = { chatId, linkedAt: new Date().toISOString() };
    saveMappings(walletMappings);
    console.log(`⚡ TMA auto-link: ${normalizedWallet} → chat ${chatId} (@${user.username || user.first_name})`);

    // Notify the user in Telegram
    try {
        await bot.sendMessage(
            chatId,
            `✅ <b>Wallet linked via Mini App!</b>\n\n` +
            `Wallet: <code>${shortAddr(normalizedWallet)}</code>\n\n` +
            `🔔 You'll now get instant Telegram notifications whenever:\n` +
            `• This wallet <b>sends</b> tokens that match your alert conditions\n` +
            `• This wallet <b>receives</b> tokens that match your alert conditions\n\n` +
            `<i>Use /status to see all your linked wallets or /unlink to disconnect.</i>`,
            { parse_mode: "HTML" }
        );
    } catch (e) {
        console.error("⚠️ Could not send TMA link confirmation message:", e.message);
    }

    res.json({ success: true });
});


// Check if a wallet is linked to a Telegram account
app.get("/api/status/:wallet", (req, res) => {
    const wallet = req.params.wallet.toLowerCase();
    const mapping = walletMappings[wallet];
    if (mapping) {
        res.json({ linked: true, linkedAt: mapping.linkedAt, chatId: mapping.chatId });
    } else {
        res.json({ linked: false });
    }
});

// Unlink a wallet from the frontend (no Telegram needed)
app.post("/api/unlink", async (req, res) => {
    const { wallet } = req.body;
    if (!wallet) return res.status(400).json({ error: "Missing wallet" });
    const normalizedWallet = wallet.toLowerCase();
    const mapping = walletMappings[normalizedWallet];
    if (!mapping) {
        return res.json({ success: false, message: "Wallet not linked" });
    }
    const chatId = mapping.chatId;
    delete walletMappings[normalizedWallet];
    saveMappings(walletMappings);
    console.log(`🔓 Unlinked wallet ${normalizedWallet} via frontend API`);
    // Notify the Telegram user that they've been unlinked
    try {
        await bot.sendMessage(
            chatId,
            `🔔 <b>You have been unlinked from ChainWatch.</b>\n\n` +
            `Wallet <code>${shortAddr(normalizedWallet)}</code> was disconnected from this Telegram account via the website.\n\n` +
            `You will no longer receive notifications for this wallet.\n\n` +
            `<i>Visit <a href="${FRONTEND_URL}">ChainWatch</a> and click "Link Telegram" again to reconnect anytime.</i>`,
            { parse_mode: "HTML", disable_web_page_preview: true }
        );
    } catch (e) {
        console.error("⚠️ Failed to send unlink notification:", e.message);
    }
    res.json({ success: true });
});

app.listen(PORT, () => {
    console.log(`🌐 HTTP server running on port ${PORT}`);
});

// ─── 2. Telegram Bot ─────────────────────────────────────────

const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });

// /start
bot.onText(/^\/start$/, (msg) => {
    const chatId = msg.chat.id;
    const name = msg.from.first_name || "there";
    bot.sendMessage(
        chatId,
        `👋 <b>Hey ${name}! Welcome to ChainWatch.</b>\n\n` +
        `I'm your real-time on-chain alert bot, powered by <b>Somnia Reactivity</b> — ` +
        `the blockchain's native pub/sub system. I'll notify you the instant a wallet you're watching moves tokens.\n\n` +
        `<b>⚡ To get started:</b>\n` +
        `1️⃣ Tap the <b>"Open App"</b> button below to launch the Mini App\n` +
        `2️⃣ Connect your wallet\n` +
        `3️⃣ Tap <b>"⚡ Auto-Link"</b> and you're done!\n\n` +
        `<i>(You can also link via the <a href="${FRONTEND_URL}">ChainWatch website</a> — click "Link Telegram" and send me the code.)</i>\n\n` +
        `<b>Commands:</b>\n` +
        `↳ <code>/link &lt;CODE&gt;</code> — Link your wallet\n` +
        `↳ <code>/status</code> — View your linked wallets\n` +
        `↳ <code>/unlink</code> — Remove all wallet links\n` +
        `↳ <code>/help</code> — Full command reference\n\n` +
        `<i>Once linked, you sit back — ChainWatch does the rest.</i> 🔭`,
        { parse_mode: "HTML", disable_web_page_preview: true }
    );
});

// /help
bot.onText(/^\/help$/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(
        chatId,
        `📖 <b>ChainWatch — Help &amp; Commands</b>\n\n` +
        `ChainWatch delivers real-time on-chain alerts to your Telegram the moment a watched wallet moves tokens on the Somnia Network.\n\n` +
        `<b>Available Commands:</b>\n` +
        `• <code>/link &lt;CODE&gt;</code> — Connect a wallet to this chat. You can link multiple wallets!\n` +
        `• <code>/status</code> — See all your currently linked wallets.\n` +
        `• <code>/unlink</code> — Disconnect <b>all</b> wallets from this Telegram account.\n` +
        `• <code>/start</code> — Show the quick start guide.\n` +
        `• <code>/help</code> — Show this message.\n\n` +
        `<b>How to Link your Wallet:</b>\n` +
        `<b>Option 1 (Fastest):</b> Tap the <b>"Open App"</b> button below, connect your wallet, and tap "⚡ Auto-Link".\n\n` +
        `<b>Option 2 (Website):</b>\n` +
        `1. Visit <a href="${FRONTEND_URL}">ChainWatch</a>\n` +
        `2. Connect your wallet and click "📲 Link Telegram"\n` +
        `3. Send the generated code here: <code>/link CW-XXXXXX</code>\n\n` +
        `<i>You can link as many wallets as you like — one connected wallet per code.</i>`,
        { parse_mode: "HTML", disable_web_page_preview: true }
    );
});

// /link (no code — show instructions)
bot.onText(/^\/link$/, (msg) => {
    bot.sendMessage(
        msg.chat.id,
        `🔗 <b>How to link your wallet</b>\n\n` +
        `To connect a wallet, you need a one-time code from the ChainWatch website.\n\n` +
        `<b>Option 1: Mini App (Recommended)</b>\n` +
        `Tap the <b>"Open App"</b> button at the bottom of this chat. Connect your wallet inside the app and tap "⚡ Auto-Link".\n\n` +
        `<b>Option 2: Website</b>\n` +
        `1. Open <a href="${FRONTEND_URL}">ChainWatch</a>\n` +
        `2. Connect your wallet\n` +
        `3. Click "📲 Link Telegram"\n` +
        `4. Send the code here: <code>/link CW-XXXXXX</code>\n\n` +
        `<i>Web codes expire after 10 minutes.</i>`,
        { parse_mode: "HTML", disable_web_page_preview: true }
    );
});

// /link <CODE>
bot.onText(/^\/link\s+(.+)$/, (msg, match) => {
    const chatId = msg.chat.id;
    const code = match[1].trim().toUpperCase();

    cleanExpiredLinks();

    const pending = pendingLinks[code];
    if (!pending) {
        bot.sendMessage(
            chatId,
            `❌ <b>Invalid or expired code.</b>\n\n` +
            `Codes expire after 10 minutes. Please visit <a href="${FRONTEND_URL}">ChainWatch</a> ` +
            `and generate a fresh one.`,
            { parse_mode: "HTML", disable_web_page_preview: true }
        );
        return;
    }

    walletMappings[pending.wallet] = { chatId, linkedAt: new Date().toISOString() };
    saveMappings(walletMappings);
    delete pendingLinks[code];

    bot.sendMessage(
        chatId,
        `✅ <b>Wallet linked successfully!</b>\n\n` +
        `Wallet: <code>${shortAddr(pending.wallet)}</code>\n\n` +
        `🔔 You'll now get instant Telegram notifications whenever:\n` +
        `• This wallet <b>sends</b> tokens that match your alert conditions\n` +
        `• This wallet <b>receives</b> tokens that match your alert conditions\n\n` +
        `<i>You can link multiple wallets! Use /status to see them all or /unlink to disconnect.</i>`,
        { parse_mode: "HTML" }
    );

    console.log(`✅ Linked wallet ${pending.wallet} → chat ${chatId}`);
});

// /unlink
bot.onText(/^\/unlink$/, async (msg) => {
    const chatId = msg.chat.id;
    const wallets = getWalletsByChatId(chatId);

    if (wallets.length === 0) {
        bot.sendMessage(
            chatId,
            `ℹ️ <b>No wallets are currently linked</b> to this Telegram account.\n\n` +
            `Visit <a href="${FRONTEND_URL}">ChainWatch</a> to link your first wallet!`,
            { parse_mode: "HTML", disable_web_page_preview: true }
        );
        return;
    }

    for (const wallet of wallets) delete walletMappings[wallet];
    saveMappings(walletMappings);
    console.log(`🔓 Unlinked ${wallets.length} wallet(s) from chat ${chatId} via bot command`);

    // Send one message per wallet — same format as the website-triggered unlink
    for (const wallet of wallets) {
        await bot.sendMessage(
            chatId,
            `🔔 <b>You have been unlinked from ChainWatch.</b>\n\n` +
            `Wallet <code>${shortAddr(wallet)}</code> was disconnected from this Telegram account via the bot.\n\n` +
            `You will no longer receive notifications for this wallet.\n\n` +
            `<i>Visit <a href="${FRONTEND_URL}">ChainWatch</a> and click "Link Telegram" again to reconnect anytime.</i>`,
            { parse_mode: "HTML", disable_web_page_preview: true }
        );
    }
});

// /status
bot.onText(/^\/status$/, (msg) => {
    const chatId = msg.chat.id;
    const wallets = getWalletsByChatId(chatId);

    if (wallets.length === 0) {
        bot.sendMessage(
            chatId,
            `ℹ️ <b>No wallets linked yet.</b>\n\n` +
            `Visit <a href="${FRONTEND_URL}">ChainWatch</a> and click <b>"📲 Link Telegram"</b> to get started.`,
            { parse_mode: "HTML", disable_web_page_preview: true }
        );
        return;
    }

    let statusMsg = `📊 <b>Your Linked Wallets (${wallets.length}):</b>\n\n`;
    for (const wallet of wallets) {
        const data = walletMappings[wallet];
        const linkedDate = new Date(data.linkedAt);
        const dateStr = linkedDate.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
        const timeStr = linkedDate.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
        statusMsg +=
            `• <code>${wallet.slice(0, 8)}...${wallet.slice(-6)}</code>\n` +
            `  🔔 Notifications: <b>Active</b>\n` +
            `  📅 Linked: <i>${dateStr} at ${timeStr}</i>\n\n`;
    }
    statusMsg +=
        `<i>Use /unlink to disconnect all wallets.\n` +
        `To link another wallet, get a new code at <a href="${FRONTEND_URL}">ChainWatch</a>.</i>`;

    bot.sendMessage(chatId, statusMsg, { parse_mode: "HTML", disable_web_page_preview: true });
});

// Catch-all: any other message
bot.on("message", (msg) => {
    const text = msg.text || "";
    // Ignore known commands
    if (/^\/(start|help|link|unlink|status)/i.test(text)) return;

    bot.sendMessage(
        msg.chat.id,
        `🤔 <b>I didn't understand that.</b>\n\n` +
        `Here's what I can do:\n` +
        `↳ <code>/start</code> — Quick start guide\n` +
        `↳ <code>/link &lt;CODE&gt;</code> — Link via website code\n` +
        `↳ <code>/status</code> — View linked wallets\n` +
        `↳ <code>/unlink</code> — Remove all links\n` +
        `↳ <code>/help</code> — Full command reference\n\n` +
        `<i>💡 <b>Pro tip:</b> It's much faster to link wallets using the "Open App" button below!</i>`,
        { parse_mode: "HTML", disable_web_page_preview: true }
    );
});

console.log("🤖 Telegram bot started (polling mode)");

// ─── 3. Blockchain Listener ─────────────────────────────────

let wsProvider = null;
let httpProvider = null;
let handlerContract = null;
let registryContract = null;
let reconnectTimer = null;

// Global dedup set — keyed by chatId+transferKey. Cleared every 60s to avoid memory growth.
const recentlySent = new Set();
setInterval(() => recentlySent.clear(), 60 * 1000);

async function handleAlertTriggered(tokenAddress, from, to, amount, blockNumber, timestamp) {
    const tokenInfo = getTokenInfo(tokenAddress);
    const formattedAmt = formatAmount(amount, tokenInfo.decimals);
    const blockNum = Number(blockNumber);
    const fromLower = from.toLowerCase();
    const toLower = to.toLowerCase();

    console.log(`🚨 AlertTriggered: ${formattedAmt} ${tokenInfo.symbol} | ${shortAddr(from)} → ${shortAddr(to)} | Block ${blockNum}`);

    // Unique transfer fingerprint (same event regardless of which subscription fired)
    const transferKey = `${blockNum}-${tokenAddress.toLowerCase()}-${fromLower}-${toLower}-${amount.toString()}`;

    try {
        if (!registryContract) return;

        const alertCount = Number(await registryContract.alertCount());

        // Collect all owners with a linked Telegram that care about this event.
        // An owner cares if their watchAddress matches EITHER `from` OR `to`.
        // We use a Map of chatId → direction so we can label the message correctly.
        // chatNotifications: Map<chatId, { direction: "sent" | "received", ownerWallet }>
        const chatNotifications = new Map();

        for (let i = 1; i <= alertCount; i++) {
            try {
                const alert = await registryContract.getAlert(i);
                if (!alert.active) continue;

                const owner = alert.owner.toLowerCase();
                const watchAddr = alert.watchAddress.toLowerCase();
                const mapping = walletMappings[owner];
                if (!mapping) continue;

                let direction = null;
                if (watchAddr === fromLower) direction = "sent";
                else if (watchAddr === toLower) direction = "received";

                if (!direction) continue;

                // Only store the first matching direction per chat (sent wins over received if same wallet is both)
                if (!chatNotifications.has(mapping.chatId)) {
                    chatNotifications.set(mapping.chatId, { direction, ownerWallet: owner });
                }
            } catch {
                continue;
            }
        }

        // Send one message per chatId, deduped globally
        for (const [chatId, { direction, ownerWallet }] of chatNotifications) {
            const dedupKey = `${chatId}-${transferKey}`;
            if (recentlySent.has(dedupKey)) {
                console.log(`⏭️ Dedup skip for chat ${chatId}`);
                continue;
            }
            recentlySent.add(dedupKey);

            const directionEmoji = direction === "sent" ? "📤" : "📥";
            const directionLabel = direction === "sent" ? "Sent" : "Received";
            const precis = tokenInfo.decimals === 6 ? 2 : 6;

            const message =
                `${directionEmoji} <b>ChainWatch Alert — ${directionLabel}</b>\n\n` +
                `<b>${formattedAmt.toFixed(precis)} ${tokenInfo.symbol}</b> ${direction}\n\n` +
                `From: <code>${shortAddr(from)}</code>\n` +
                `To: <code>${shortAddr(to)}</code>\n` +
                `Block: <a href="${EXPLORER_BASE}/block/${blockNum}">#${blockNum}</a>\n` +
                `Token: <a href="${EXPLORER_BASE}/address/${tokenAddress}">${tokenInfo.symbol}</a>\n\n` +
                `<a href="${EXPLORER_BASE}/address/${direction === "sent" ? from : to}">View transaction →</a>`;

            try {
                await bot.sendMessage(chatId, message, {
                    parse_mode: "HTML",
                    disable_web_page_preview: true,
                });
                console.log(`📨 Sent "${directionLabel}" notification → chat ${chatId} (owner ${shortAddr(ownerWallet)})`);
            } catch (e) {
                console.error(`❌ Failed to send to chat ${chatId}:`, e.message);
            }
        }
    } catch (e) {
        console.error("❌ Error processing alert:", e.message);
    }
}

async function connectBlockchain() {
    try {
        if (wsProvider) {
            try { wsProvider.removeAllListeners(); await wsProvider.destroy(); } catch { }
        }

        console.log("⛓️  Connecting to Somnia WSS...");
        httpProvider = new ethers.JsonRpcProvider(SOMNIA_RPC);
        registryContract = new ethers.Contract(ALERT_REGISTRY_ADDRESS, ALERT_REGISTRY_ABI, httpProvider);

        wsProvider = new ethers.WebSocketProvider(SOMNIA_WSS);
        await wsProvider.ready;
        const network = await wsProvider.getNetwork();
        console.log(`⛓️  Connected to chain ID: ${network.chainId}`);

        handlerContract = new ethers.Contract(ALERT_HANDLER_ADDRESS, ALERT_HANDLER_ABI, wsProvider);
        handlerContract.on("AlertTriggered", handleAlertTriggered);
        console.log(`👂 Listening for AlertTriggered on ${ALERT_HANDLER_ADDRESS}`);

        wsProvider.websocket.on("error", (err) => {
            console.error("⚠️ WSS error:", err.message);
            scheduleReconnect();
        });
        wsProvider.websocket.on("close", () => {
            console.log("⚠️ WSS closed, reconnecting...");
            scheduleReconnect();
        });
    } catch (e) {
        console.error("❌ Blockchain connection failed:", e.message);
        scheduleReconnect();
    }
}

function scheduleReconnect() {
    if (reconnectTimer) return;
    reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        connectBlockchain();
    }, 5000);
}

// ─── Start ───────────────────────────────────────────────────

connectBlockchain();

console.log(`
╔══════════════════════════════════════════════════╗
║         ChainWatch Telegram Bot Started          ║
╠══════════════════════════════════════════════════╣
║  HTTP Server:     http://localhost:${PORT}           ║
║  Telegram Bot:    Polling mode                   ║
║  Blockchain:      Somnia WSS                     ║
║  Linked wallets:  ${Object.keys(walletMappings).length.toString().padEnd(29)}║
╚══════════════════════════════════════════════════╝
`);