import { useAccount } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";

export function LandingPage() {
    const { isConnected } = useAccount();
    const { openConnectModal } = useConnectModal();

    if (isConnected) return null;

    return (
        <div className="landing">
            <div className="landing-bg-grid" />
            <div className="landing-glow landing-glow-1" />
            <div className="landing-glow landing-glow-2" />

            <nav className="landing-nav">
                <div className="landing-logo">
                    <img src="/logo.png" alt="ChainWatch Logo" className="landing-logo-img" />
                    ChainWatch
                </div>
            </nav>

            <main className="landing-main">
                <div className="landing-badge">
                    ⚡ Powered by Somnia Reactivity
                </div>

                <h1 className="landing-headline">
                    Your wallet,{" "}
                    <span className="landing-headline-accent">always watching.</span>
                </h1>

                <p className="landing-sub">
                    Register on-chain alerts and get notified — in your browser and on Telegram —
                    the instant a wallet moves tokens. No polling. No backend. The chain watches itself.
                </p>

                <div className="landing-cta">
                    <button
                        className="btn-landing-primary"
                        onClick={openConnectModal}
                    >
                        Connect Wallet to Start
                        <span className="btn-arrow">→</span>
                    </button>
                </div>

                <div className="landing-features">
                    <div className="landing-feature">
                        <span className="feature-icon">⚡</span>
                        <div>
                            <strong>Sub-second delivery</strong>
                            <p>Alerts fire at the block level — no delays, no polling</p>
                        </div>
                    </div>
                    <div className="landing-feature">
                        <span className="feature-icon">🛡️</span>
                        <div>
                            <strong>Trustless &amp; on-chain</strong>
                            <p>Subscriptions live on Somnia — not on our servers</p>
                        </div>
                    </div>
                    <div className="landing-feature">
                        <span className="feature-icon">📲</span>
                        <div>
                            <strong>Telegram notifications</strong>
                            <p>Link your wallet once, get pushed alerts anywhere</p>
                        </div>
                    </div>
                    <div className="landing-feature">
                        <span className="feature-icon">👁️</span>
                        <div>
                            <strong>Watch any wallet</strong>
                            <p>Monitor transfers in and out — for any ERC20 token</p>
                        </div>
                    </div>
                </div>
            </main>

            <footer className="landing-footer">
                Built for the{" "}
                <a href="https://docs.somnia.network/developer/reactivity" target="_blank" rel="noopener noreferrer">
                    Somnia Reactivity Hackathon
                </a>
            </footer>
        </div>
    );
}
