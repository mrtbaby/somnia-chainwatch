# ChainWatch Telegram Bot

Real-time Telegram notifications for ChainWatch alerts on Somnia.

## Setup

### 1. Create a Telegram Bot

1. Open Telegram, search for **@BotFather**
2. Send `/newbot` and follow the prompts
3. Copy the **bot token** (looks like `123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11`)
4. Optionally, use `/setcommands` in BotFather to register the command list:
   ```
   start - Quick start guide
   link - Link your wallet (usage: /link CW-XXXXXX)
   status - View your linked wallets
   unlink - Remove all wallet links
   help - Full command reference
   ```

### 2. Deploy on Replit

1. Create a new **Node.js** Repl on [replit.com](https://replit.com)
2. Upload all files from this `telegram-bot/` folder
3. In Replit's **Secrets** tab, add:
   - `TELEGRAM_BOT_TOKEN` = your bot token from BotFather
   - `SOMNIA_WSS` = `wss://dream-rpc.somnia.network/ws`
   - `SOMNIA_RPC` = `https://dream-rpc.somnia.network`
   - `ALERT_HANDLER_ADDRESS` = `0x35Fd4a29F6BAD54FfDC57aFdaB0fC01806A2A9E1`
   - `ALERT_REGISTRY_ADDRESS` = `0xE27031362d69C828D0F169cA4817C3cCaB6bE797`
   - `FRONTEND_URL` = your deployed Vercel frontend URL (e.g. `https://somnia-chainwatch.vercel.app`)
4. Click **Run** — the bot starts automatically

### 3. Keep-Alive with cron-job.org

Replit free tier sleeps after ~5 minutes of inactivity.

1. Go to [cron-job.org](https://cron-job.org) and create a free account
2. Create a new cron job:
   - **URL**: `https://your-repl-name.your-username.repl.co/health`
   - **Interval**: Every 3 minutes
   - **Method**: GET
3. Save — your bot will now stay alive 24/7

### 4. Update Frontend

In your frontend `.env`, add:
```
VITE_TELEGRAM_BOT_API=https://your-repl-name.your-username.repl.co
VITE_TELEGRAM_BOT_USERNAME=YourBotUsername
```

## Bot Commands

| Command | Description |
|---------|-------------|
| `/start` | Quick start guide and welcome message |
| `/link <CODE>` | Link your wallet using a `CW-XXXXXX` code from the website |
| `/status` | View all currently linked wallets with link date and time |
| `/unlink` | Remove all linked wallets from this Telegram account |
| `/help` | Full command reference and linking instructions |

### Linking Flow (Option 1: Mini App - Recommended)

1. Open the bot in Telegram and tap the **"Open App"** button at the bottom left
2. Connect your wallet via WalletConnect inside the Mini App
3. Tap **"⚡ Auto-Link"** 
4. The wallet is instantly linked securely to your Telegram account, no code needed.

### Linking Flow (Option 2: Web to Bot)

1. Visit the [ChainWatch website](https://somnia-chainwatch.vercel.app)
2. Connect your wallet
3. Click **"📲 Link Telegram"** — a one-time code like `CW-AB3X7Q` will appear
4. Send it to the bot: `/link CW-AB3X7Q`
5. The bot confirms and starts delivering alerts instantly

> Codes expire after 10 minutes. You can link multiple wallets — one code per wallet.

### Unlinking

You can unlink a wallet in two ways:
- **From the website:** Click **"🔓 Unlink Telegram"** on the dashboard
- **From the bot:** Send `/unlink` — this removes all linked wallets and notifies you in Telegram

In both cases, the bot sends a confirmation message and the frontend updates automatically within ~10 seconds.

## Architecture

```
HTTP Server (port 3000)
  ├── GET /           → Health check + stats
  ├── GET /health     → Simple OK response (for cron-job.org)
  ├── POST /api/link  → Register a pending link code from the frontend
  ├── POST /api/link-tma → Verify initData and auto-link Mini App users
  ├── GET /api/status/:wallet → Check if a wallet is linked
  └── POST /api/unlink → Unlink a wallet from the frontend

Telegram Bot (polling)
  ├── /start   → Quick start guide
  ├── /link    → Step-by-step linking instructions (no code) or complete link flow (with code)
  ├── /status  → Show all linked wallets with link timestamps
  ├── /unlink  → Remove all wallet links
  ├── /help    → Full command reference
  └── *        → Catch-all unrecognized message handler

Blockchain Listener (WSS)
  └── AlertTriggered event → lookup wallet owner → send Telegram notification
```
