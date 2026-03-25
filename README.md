# 🔭 ChainWatch — Reactive On-Chain Alert System

> Trustless on-chain alerts powered by **Somnia Reactivity**. No polling. No backend. The chain watches itself.

Built for the [Somnia Reactivity Mini Hackathon](https://docs.somnia.network/developer/reactivity) • Somnia Testnet (Chain ID: 50312)

---

## 🚀 What It Does

Users register **threshold-based alerts** directly on the Somnia blockchain to watch any wallet address. When a monitored wallet moves STT tokens (or supported ERC20s) above the set threshold, the chain **automatically detects it and pushes a real-time notification** to the user's browser **and Telegram account** — with zero polling, no centralized backend, and no cron jobs.

### Features
- ⚡ **Sub-second Delivery:** Alerts fire at the block level.
- 🛡️ **Trustless & On-chain:** Subscriptions live natively on the Somnia network.
- 📲 **Telegram Mini App:** Access the full ChainWatch dashboard directly inside Telegram. Connect your wallet and tap "⚡ Auto-Link" to get started instantly.
- 📥 **Bi-directional Monitoring:** Get alerts whether your watched wallet *sends* or *receives* tokens.
- 👁️ **Watch Any Wallet:** Monitor transfers in and out without needing the private key.

### The Demo Pitch
> *"I registered an alert on-chain, linked my Telegram, and walked away. The moment a whale moved 10,000 WSTT — the chain detected it, the handler fired automatically, and my phone buzzed with a Telegram notification in under a second. No backend. No polling."*

---

## 🏗️ How Somnia Reactivity Powers This

ChainWatch uses **both** Reactivity modes:

### Mode A: On-Chain (Solidity Handler)
`AlertHandler.sol` inherits `SomniaEventHandler`. When a matching Transfer event fires, Somnia's validators **automatically call** `_onEvent()`, which emits an `AlertTriggered` event. No off-chain relay needed.

- [Solidity On-Chain Reactivity Tutorial](https://docs.somnia.network/developer/reactivity/tutorials/solidity-on-chain-reactivity-tutorial)

### Mode B: Off-Chain (TypeScript SDK / WebSocket)
The frontend uses `@somnia-chain/reactivity` SDK to subscribe via WebSocket to `AlertTriggered` events. The chain **pushes** data the instant the event fires — sub-second delivery.

- [Off-Chain TypeScript SDK](https://docs.somnia.network/developer/reactivity/tooling/off-chain-typescript)

### Data Flow
```
1. User registers alert → AlertRegistry.registerAlert() on-chain
2. Creates Reactivity subscription for wallet's Transfer events
3. Whale sends large transfer
4. Somnia Reactivity Precompile detects match
5. Validators call AlertHandler._onEvent()
6. AlertHandler emits AlertTriggered event
7. SDK WebSocket subscription fires callback
8. Frontend displays real-time notification 🔔
9. Telegram Bot detects event → looks up Telegram linkage → pushes message 📲
```

---

## 📦 Architecture

| Component | Tech | Purpose |
|---|---|---|
| `AlertHandler.sol` | Solidity 0.8.30 | Receives reactive callbacks, emits `AlertTriggered` |
| `AlertRegistry.sol` | Solidity 0.8.30 | Stores alerts, creates Reactivity subscriptions via precompile `0x0100` |
| `useReactivity.ts` | TypeScript SDK | WebSocket subscription hook for real-time push |
| Frontend | React + Vite + wagmi | Alert registration, live event feed, and Telegram Web App UI |
| Telegram Bot | Node.js + Express | TMA API + WSS listener + Commands (`/start` `/link` `/status` `/unlink`) |

### Deployed Contracts (Somnia Testnet)
| Contract | Address |
|---|---|
| AlertHandler | `0x35Fd4a29F6BAD54FfDC57aFdaB0fC01806A2A9E1` |
| AlertRegistry | `0xE27031362d69C828D0F169cA4817C3cCaB6bE797` |

---

## 🛠️ Setup & Run

### Prerequisites
- Node.js v18+
- MetaMask / Rabby with Somnia Testnet added
- 32+ STT from [faucet](https://testnet.somnia.network)

### 1. Clone & Install
```bash
git clone <repo-url>
cd chainwatch
npm install --legacy-peer-deps
```

### 2. Configure Environment
```bash
# Edit .env with your wallet private key
# ⚠️ Never commit this file
PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE
```

### 3. Compile & Deploy Contracts
```bash
npx hardhat compile
npx hardhat run scripts/deploy.ts --network somniaTestnet
```

Copy the deployed addresses into `.env`, `frontend/.env`, and `telegram-bot/.env`:
```bash
# .env
ALERT_HANDLER_ADDRESS=0x...
ALERT_REGISTRY_ADDRESS=0x...

# frontend/.env
VITE_ALERT_HANDLER_ADDRESS=0x...
VITE_ALERT_REGISTRY_ADDRESS=0x...
VITE_TELEGRAM_BOT_API=http://localhost:3000
VITE_TELEGRAM_BOT_USERNAME=YourBotName
```

### 4. Run Locally

**Start the Telegram Bot (Terminal 1):**
```bash
cd telegram-bot
npm install
# Set your Telegram bot token in telegram-bot/.env first
node index.js
```

**Start the Frontend (Terminal 2):**
```bash
cd frontend
npm install
npm run dev
```

### 5. Deployment Guide

**Telegram Bot (Replit / VPS)**
1. Create a bot via [@BotFather](https://t.me/BotFather) to get your token.
2. Under **Bot Settings → Menu Button → Configure Mini App URL**, paste your Vercel URL.
3. Push your code to GitHub and import the repository into [Replit](https://replit.com/).
4. Add your `.env` variables (including `TELEGRAM_BOT_TOKEN`) into the Replit Secrets tool.
5. Run the repl. Replit will host the bot and expose a URL (e.g., `https://your-bot.replit.app`).
6. Use [cron-job.org](https://cron-job.org) to ping your bot's `/health` endpoint every 3 minutes so it does not go to sleep.

**Frontend (Vercel)**
1. Log into [Vercel](https://vercel.com) and import your GitHub repository.
2. Ensure the **Root Directory** is set to `frontend`.
3. Add your `VITE_*` environment variables in the Vercel deployment settings. Ensure `VITE_TELEGRAM_BOT_API` is set to your live Replit URL.
4. Deploy!
5. *Important:* Update the `FRONTEND_URL` environment variable back on your Replit bot to point to your new live Vercel URL.

---

### 6. Demo: Trigger an Alert

Native STT transfers do not emit EVM logs, but **all ERC20 testing tokens** (like WSTT, USDC, etc.) do. Because our `AlertRegistry` uses a wildcard for the token emitter address, anyone sending *any* token from the watched wallet will trigger the alert natively.

1. Open the bot in Telegram and tap **Open App** to launch the Mini App.
2. Connect your wallet via WalletConnect.
3. Tap **⚡ Auto-Link** to securely link to your Telegram account.
4. Register an alert watching your own wallet or a whale's wallet.
5. **Send some test tokens** to another address (or wait for the whale to move tokens).
6. Watch the magic — the `AlertTriggered` notification will instantly appear in the web UI, and your phone will buzz with a Telegram message at the exact same moment!

---

## 🔑 Key Technical Details

- **On-chain subscription owner must hold 32+ STT** minimum balance
- **Gas limit: 2,000,000** (Somnia requires 1M gas reserve for storage ops)
- **maxFeePerGas: 10 gwei** — comfortable ceiling (base fee ~6 nanoSomi)
- **WebSocket URL is mandatory** in chain definition for Reactivity
- **After redeploying**, always recreate subscriptions (tied to old address)
- **Never emit events in `_onEvent()`** that trigger the same handler (infinite loop)

---

## 📚 Official Docs
- [What is Reactivity?](https://docs.somnia.network/developer/reactivity/what-is-reactivity)
- [Subscriptions: The Core Primitive](https://docs.somnia.network/developer/reactivity/subscriptions-the-core-primitive)
- [Gas Configuration](https://docs.somnia.network/developer/reactivity/gas-configuration)
- [FAQs & Troubleshooting](https://docs.somnia.network/developer/reactivity/faqs-and-troubleshooting)
- [API Reference](https://docs.somnia.network/developer/reactivity/api-reference)

---

## 📄 License
MIT
