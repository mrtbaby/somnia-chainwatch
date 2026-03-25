import { useState, useEffect, useCallback } from "react";
import { useAccount } from "wagmi";

const BOT_API = import.meta.env.VITE_TELEGRAM_BOT_API || "";
const BOT_USERNAME = import.meta.env.VITE_TELEGRAM_BOT_USERNAME || "";

// ── Detect if running inside a Telegram Mini App ──────────────
const isTMA = Boolean(window.Telegram?.WebApp?.initDataUnsafe?.user);

type LinkStatus = "checking" | "unlinked" | "pending" | "linked" | "error";

function generateCode(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "CW-";
    for (let i = 0; i < 6; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
}

interface LinkedInfo {
    linkedAt: string;
    chatId: number;
}

export function TelegramLink() {
    const { address, isConnected } = useAccount();
    const [status, setStatus] = useState<LinkStatus>("checking");
    const [linkCode, setLinkCode] = useState<string | null>(null);
    const [linkedInfo, setLinkedInfo] = useState<LinkedInfo | null>(null);
    const [copied, setCopied] = useState(false);
    const [unlinking, setUnlinking] = useState(false);
    const [autoLinking, setAutoLinking] = useState(false);

    // ── Check link status ──────────────────────────────────────
    const checkStatus = useCallback(async () => {
        if (!address || !BOT_API) return;
        setStatus("checking");
        try {
            const res = await fetch(`${BOT_API}/api/status/${address}`);
            const data = await res.json();
            if (data.linked) {
                setLinkedInfo({ linkedAt: data.linkedAt, chatId: data.chatId });
                setStatus("linked");
            } else {
                setLinkedInfo(null);
                setStatus("unlinked");
            }
        } catch {
            setStatus("error");
        }
    }, [address]);

    useEffect(() => {
        if (isConnected && address && BOT_API) {
            checkStatus();
        }
    }, [isConnected, address, checkStatus]);

    // ── Poll every 4s when pending (waiting for /link from user) ──
    useEffect(() => {
        if (status !== "pending") return;
        const interval = setInterval(async () => {
            if (!address || !BOT_API) return;
            try {
                const res = await fetch(`${BOT_API}/api/status/${address}`);
                const data = await res.json();
                if (data.linked) {
                    setLinkedInfo({ linkedAt: data.linkedAt, chatId: data.chatId });
                    setStatus("linked");
                    setLinkCode(null);
                }
            } catch { /* ignore polling errors */ }
        }, 4000);
        return () => clearInterval(interval);
    }, [status, address]);

    // ── Poll every 10s when linked — to detect bot-side /unlink ──
    useEffect(() => {
        if (status !== "linked") return;
        const interval = setInterval(async () => {
            if (!address || !BOT_API) return;
            try {
                const res = await fetch(`${BOT_API}/api/status/${address}`);
                const data = await res.json();
                if (!data.linked) {
                    setLinkedInfo(null);
                    setStatus("unlinked");
                }
            } catch { /* ignore polling errors */ }
        }, 10_000);
        return () => clearInterval(interval);
    }, [status, address]);

    // ── Generate a code (web users) ───────────────────────────
    const handleGenerate = async () => {
        if (!address || !BOT_API) return;
        const code = generateCode();
        try {
            const res = await fetch(`${BOT_API}/api/link`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code, wallet: address }),
            });
            if (!res.ok) throw new Error();
            setLinkCode(code);
            setStatus("pending");
        } catch {
            setStatus("error");
        }
    };

    // ── 1-Click Auto-Link (TMA users) ─────────────────────────
    const handleAutoLink = async () => {
        if (!address || !BOT_API) return;
        const initData = window.Telegram?.WebApp?.initData;
        if (!initData) return;
        setAutoLinking(true);
        try {
            const res = await fetch(`${BOT_API}/api/link-tma`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ walletAddress: address, initData }),
            });
            if (!res.ok) throw new Error();
            // Re-check status — bot will have already written the mapping
            await checkStatus();
        } catch {
            setStatus("error");
        } finally {
            setAutoLinking(false);
        }
    };

    // ── Unlink (works from both web and TMA) ──────────────────
    const handleUnlink = async () => {
        if (!address || !BOT_API) return;
        setUnlinking(true);
        try {
            const res = await fetch(`${BOT_API}/api/unlink`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ wallet: address }),
            });
            if (!res.ok) throw new Error();
            setLinkedInfo(null);
            setStatus("unlinked");
            setLinkCode(null);
        } catch {
            setStatus("unlinked");
        } finally {
            setUnlinking(false);
        }
    };

    const handleCopyCommand = () => {
        if (!linkCode) return;
        navigator.clipboard.writeText(`/link ${linkCode}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };

    if (!isConnected || !BOT_API) return null;

    return (
        <div className="card telegram-link card--coral">
            <div className="card-header">
                <div className="feed-title">
                    <span className="card-icon">📲</span>
                    <h2>Telegram Notifications</h2>
                </div>
                {status === "linked" && (
                    <span className="tg-linked-badge">✅ Linked</span>
                )}
            </div>

            {/* ── Checking ── */}
            {status === "checking" && (
                <div className="telegram-body">
                    <p className="text-muted text-sm">Checking Telegram link status…</p>
                </div>
            )}

            {/* ── Linked ── */}
            {status === "linked" && linkedInfo && (
                <div className="telegram-body">
                    <div className="tg-linked-info">
                        <div className="tg-linked-row">
                            <span className="tg-label">Bot</span>
                            <a
                                href={`https://t.me/${BOT_USERNAME}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="tg-value"
                            >
                                @{BOT_USERNAME}
                            </a>
                        </div>
                        <div className="tg-linked-row">
                            <span className="tg-label">Linked on</span>
                            <span className="tg-value">
                                {new Date(linkedInfo.linkedAt).toLocaleDateString(undefined, {
                                    year: "numeric", month: "short", day: "numeric",
                                })}
                            </span>
                        </div>
                        <div className="tg-linked-row">
                            <span className="tg-label">Alerts</span>
                            <span className="tg-value tg-active">Active — receiving sent &amp; received</span>
                        </div>
                    </div>
                    <p className="text-muted text-sm" style={{ margin: "12px 0 16px" }}>
                        Your Telegram stays linked even when you disconnect your wallet.
                        To stop notifications, unlink below.
                    </p>
                    <button
                        className="btn btn-secondary btn-full"
                        onClick={handleUnlink}
                        disabled={unlinking}
                    >
                        {unlinking ? "Unlinking…" : "🔓 Unlink Telegram"}
                    </button>
                </div>
            )}

            {/* ── Pending (web-only, waiting for /link command) ── */}
            {status === "pending" && linkCode && (
                <div className="telegram-body">
                    <div className="link-instructions">
                        <p className="telegram-step">
                            <span className="step-num">1</span>
                            Open{" "}
                            <a
                                href={`https://t.me/${BOT_USERNAME}`}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                @{BOT_USERNAME}
                            </a>{" "}
                            on Telegram
                        </p>
                        <p className="telegram-step">
                            <span className="step-num">2</span>
                            Send this command:
                        </p>
                        <div className="link-code-box" onClick={handleCopyCommand}>
                            <code>/link {linkCode}</code>
                            <span className="copy-hint">
                                {copied ? "✅ Copied!" : "Click to copy"}
                            </span>
                        </div>
                    </div>
                    <div className="tg-waiting">
                        <span className="tg-pulse" />
                        Waiting for you to link in Telegram…
                    </div>
                    <p className="text-muted text-sm" style={{ marginTop: "8px" }}>
                        ⏱ Code expires in 10 minutes.
                    </p>
                    <button
                        className="btn btn-secondary btn-full"
                        style={{ marginTop: "12px" }}
                        onClick={() => { setStatus("unlinked"); setLinkCode(null); }}
                    >
                        Cancel
                    </button>
                </div>
            )}

            {/* ── Unlinked ── */}
            {status === "unlinked" && (
                <div className="telegram-body">
                    <p className="text-muted text-sm" style={{ marginBottom: "12px" }}>
                        Get real-time alerts delivered to your Telegram when your
                        watched wallets trigger events.
                    </p>

                    {isTMA ? (
                        /* TMA: 1-click auto-link (no code needed) */
                        <button
                            className="btn btn-primary btn-full"
                            onClick={handleAutoLink}
                            disabled={autoLinking}
                        >
                            {autoLinking ? "Linking…" : "⚡ Auto-Link to this Telegram"}
                        </button>
                    ) : (
                        /* Web: classic code-based flow */
                        <button className="btn btn-primary btn-full" onClick={handleGenerate}>
                            🔗 Link Telegram
                        </button>
                    )}
                </div>
            )}

            {/* ── Error ── */}
            {status === "error" && (
                <div className="telegram-body">
                    <div className="alert alert-error">
                        <span>❌</span> Could not reach the bot server. Is it running on Replit?
                    </div>
                    <button
                        className="btn btn-secondary btn-full"
                        style={{ marginTop: "8px" }}
                        onClick={checkStatus}
                    >
                        Retry
                    </button>
                </div>
            )}
        </div>
    );
}
