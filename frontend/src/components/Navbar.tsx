import { useState, useEffect } from "react";
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from "motion/react";
import { Menu, X } from "lucide-react";
import { useAccount } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { LiquidMetalButton } from "./LiquidMetalButton";

export function Navbar() {
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const { isConnected } = useAccount();
    const { openConnectModal } = useConnectModal();

    const { scrollY } = useScroll();

    useMotionValueEvent(scrollY, "change", (latest) => {
        setIsScrolled(latest > 50);
    });

    // Close mobile menu on desktop resize
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 768) setIsMobileMenuOpen(false);
        };
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    return (
        <AnimatePresence mode="wait">
            <motion.nav
                initial={{ y: -100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className={`floating-nav ${isScrolled || isMobileMenuOpen ? "floating-nav--solid" : "floating-nav--glass"} ${isMobileMenuOpen ? "floating-nav--expanded" : ""}`}
            >
                <div className="floating-nav-row">
                    {/* Logo */}
                    <a href="/" className="floating-nav-logo" aria-label="ChainWatch — Home">
                        <img src="/logo.png" alt="ChainWatch" className="floating-nav-logo-img" />
                    </a>

                    {/* Centered brand name */}
                    <span className="floating-nav-brand">ChainWatch</span>

                    {/* Desktop CTA */}
                    <div className="floating-nav-actions">
                        {!isConnected && (
                            <LiquidMetalButton
                                onClick={openConnectModal}
                                label="Connect Wallet"
                                width={180}
                            />
                        )}
                    </div>

                    {/* Mobile hamburger */}
                    {!isConnected && (
                        <button
                            className="floating-nav-hamburger"
                            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
                            aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
                            aria-expanded={isMobileMenuOpen}
                        >
                            {isMobileMenuOpen ? (
                                <X className="floating-nav-hamburger-icon" />
                            ) : (
                                <Menu className="floating-nav-hamburger-icon" />
                            )}
                        </button>
                    )}
                </div>

                {/* Mobile dropdown */}
                <AnimatePresence>
                    {isMobileMenuOpen && !isConnected && (
                        <motion.div
                            key="mobile-menu"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                            className="floating-nav-mobile"
                        >
                            <LiquidMetalButton
                                onClick={() => {
                                    setIsMobileMenuOpen(false);
                                    openConnectModal?.();
                                }}
                                label="Connect Wallet"
                                width={240}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.nav>
        </AnimatePresence>
    );
}
