import "@rainbow-me/rainbowkit/styles.css";
import { getDefaultConfig, RainbowKitProvider, lightTheme } from "@rainbow-me/rainbowkit";
import { WagmiProvider, useAccount } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http } from "viem";
import { somniaTestnet } from "./lib/chains";
import { AlertForm } from "./components/AlertForm";
import { AlertFeed } from "./components/AlertFeed";
import { WalletConnect } from "./components/WalletConnect";
import { RegisteredAlerts } from "./components/RegisteredAlerts";
import { TelegramLink } from "./components/TelegramLink";
import { LandingPage } from "./components/LandingPage";
import { Footer } from "./components/Footer";
import "./App.css";

// ── Telegram Mini App Bootstrap ────────────────────────────────
// Runs once at module load — safe to call outside React.
declare global {
    interface Window {
        Telegram?: {
            WebApp?: {
                expand: () => void;
                openLink: (url: string) => void;
                initData: string;
                initDataUnsafe: { user?: { id: number; first_name: string; username?: string } };
            };
        };
    }
}

const twa = window.Telegram?.WebApp;
if (twa) {
    // Expand to full height
    twa.expand();

    // Deep-link override for Telegram WebView
    // The Telegram Android WebView blocks custom URI schemes (wc:, metamask://, etc.)
    // so we intercept window.open calls and route them through twa.openLink().
    const originalOpen = window.open.bind(window);
    window.open = (url?: string | URL, ...args) => {
        if (typeof url === "string") {
            // 1. WalletConnect URI (wc:xxxxx@2?...)
            //    Android needs wc:// not wc: — fix the scheme, then use openLink.
            if (url.startsWith("wc:")) {
                const wcUrl = url.startsWith("wc://") ? url : url.replace("wc:", "wc://");
                twa.openLink(wcUrl);
                return null;
            }

            // 2. Known wallet deep-link schemes → convert to universal HTTPS links
            const walletAppLinks: Record<string, string> = {
                "metamask://": "https://metamask.app.link/",
                "trust://": "https://link.trustwallet.com/",
                "rainbow://": "https://rnbwapp.com/",
                "coinbase://": "https://go.cb-w.com/",
                "zerion://": "https://app.zerion.io/",
                "uniswap://": "https://uniswap.org/app/",
                "okx://": "https://www.okx.com/download/",
                "bitkeep://": "https://bkcode.vip/",
            };
            for (const [scheme, https] of Object.entries(walletAppLinks)) {
                if (url.startsWith(scheme)) {
                    twa.openLink(url.replace(scheme, https));
                    return null;
                }
            }

            // 3. Any other external HTTPS link (wallet universal links, etc.)
            //    Telegram WebView often blocks these from opening natively,
            //    so route through openLink to let the OS handle them.
            if (url.startsWith("https://") && !url.includes(window.location.host)) {
                twa.openLink(url);
                return null;
            }
        }
        return originalOpen(url as string, ...args);
    };
}

// ── Wallet Configuration ───────────────────────────────────────
// showQrModal: false prevents WalletConnect's built-in modal from
// conflicting with RainbowKit's modal (which caused the auto-close bug).
// RainbowKit handles the full mobile deep-link flow natively.
const config = getDefaultConfig({
    appName: "ChainWatch",
    projectId: import.meta.env.VITE_PROJECT_ID || "YOUR_PROJECT_ID",
    chains: [somniaTestnet],
    transports: { [somniaTestnet.id]: http() },
    walletConnectParameters: { showQrModal: false },
});

const queryClient = new QueryClient();

/** Inner component — lives inside providers so it can use wagmi hooks */
function AppContent() {
    const { isConnected } = useAccount();

    // Request browser notification permission on load
    if (
        typeof Notification !== "undefined" &&
        Notification.permission === "default"
    ) {
        Notification.requestPermission();
    }

    return (
        <div className="app">
            {!isConnected ? (
                <LandingPage />
            ) : (
                <>
                    <header className="main-header">
                        <div className="main-header-brand">
                            <img src="/logo.png" alt="ChainWatch" className="main-header-logo" />
                            <span className="main-header-title">ChainWatch</span>
                        </div>
                        <div className="main-header-actions">
                            <WalletConnect />
                        </div>
                    </header>

                    <main className="main">
                        <div
                            className="hero-banner hero-banner--black"
                            style={{
                                backgroundColor: '#000000',
                                backgroundImage: 'none',
                                color: '#ffffff',
                                opacity: 1,
                                position: 'relative',
                                zIndex: 10
                            }}
                        >
                            <div className="hero-content" style={{ position: 'relative', zIndex: 20 }}>
                                <h2 style={{ color: '#ffffff' }}>No polling. No backend. The chain watches itself.</h2>
                                <p style={{ color: '#ffffff', opacity: 1 }}>
                                    Register threshold alerts on-chain. Get push notifications
                                    the instant conditions are met — sub-second delivery via
                                    Somnia's native pub/sub system.
                                </p>
                            </div>
                            <div className="hero-stats">
                                <div className="stat">
                                    <span className="stat-value">&lt;1s</span>
                                    <span className="stat-label">Delivery</span>
                                </div>
                                <div className="stat">
                                    <span className="stat-value">0</span>
                                    <span className="stat-label">Polling</span>
                                </div>
                                <div className="stat">
                                    <span className="stat-value">∞</span>
                                    <span className="stat-label">Uptime</span>
                                </div>
                            </div>
                        </div>

                        <div className="grid">
                            <AlertForm />
                            <AlertFeed />
                        </div>

                        <RegisteredAlerts />

                        <TelegramLink />
                    </main>

                    <Footer />
                </>
            )}
        </div>
    );
}

export default function App() {
    return (
        <WagmiProvider config={config}>
            <QueryClientProvider client={queryClient}>
                <RainbowKitProvider
                    theme={lightTheme({
                        accentColor: "#7C3AED",
                        accentColorForeground: "white",
                        borderRadius: "small",
                        fontStack: "system",
                        overlayBlur: "small",
                    })}
                >
                    <AppContent />
                </RainbowKitProvider>
            </QueryClientProvider>
        </WagmiProvider>
    );
}