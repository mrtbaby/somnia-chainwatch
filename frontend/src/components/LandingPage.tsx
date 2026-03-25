import { useAccount } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { FeaturesSection } from "./FeaturesSection";
import { Navbar } from "./Navbar";
import { LiquidMetalButton } from "./LiquidMetalButton";
import { Footer } from "./Footer";
import { HeroBackground } from "./HeroBackground";
import { BGPattern } from "./BGPattern";
import { motion } from "motion/react";

export function LandingPage() {
    const { isConnected } = useAccount();
    const { openConnectModal } = useConnectModal();

    if (isConnected) return null;

    const fadeUp = {
        hidden: { opacity: 0, y: 30, scale: 0.95 },
        visible: (i: number) => ({
            opacity: 1,
            y: 0,
            scale: 1,
            transition: {
                duration: 1,
                delay: 0.3 + i * 0.15,
                ease: [0.25, 0.4, 0.25, 1] as const,
            },
        }),
    };

    return (
        <div className="landing relative overflow-hidden">
            {/* Technical Grid Background */}
            <BGPattern 
                variant="grid" 
                size={40} 
                fill="rgba(124, 58, 237, 0.1)" 
                mask="fade-edges"
            />
            
            {/* Elegant Background Shapes */}
            <HeroBackground />

            {/* Floating Navbar */}
            <Navbar />

            {/* Hero Content */}
            <main className="landing-main">
                <motion.h1
                    custom={0}
                    variants={fadeUp}
                    initial="hidden"
                    animate="visible"
                    className="landing-headline"
                >
                    Your wallet,{" "}
                    <span className="landing-headline-accent">always watching.</span>
                </motion.h1>

                <motion.p
                    custom={1}
                    variants={fadeUp}
                    initial="hidden"
                    animate="visible"
                    className="landing-sub"
                >
                    Register on-chain alerts and get notified — in your browser and on Telegram —
                    the instant a wallet moves tokens. No polling. No backend. The chain watches itself.
                </motion.p>

                <motion.div
                    custom={2}
                    variants={fadeUp}
                    initial="hidden"
                    animate="visible"
                    className="landing-cta"
                >
                    <LiquidMetalButton
                        label="Connect Wallet to Start"
                        onClick={openConnectModal}
                    />
                </motion.div>
            </main>

            {/* Features Grid */}
            <FeaturesSection />

            {/* Footer */}
            <Footer />
        </div>
    );
}
