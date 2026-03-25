import { motion, useReducedMotion } from "motion/react";
import type { ComponentProps, ReactNode } from "react";
import { BGPattern } from "./BGPattern";

/* ─── Footer Link Data ──────────────────────────────────────── */

interface FooterLink {
    title: string;
    href: string;
    external?: boolean;
}

interface FooterSection {
    label: string;
    links: FooterLink[];
}

const footerSections: FooterSection[] = [
    {
        label: "Product",
        links: [
            { title: "Dashboard", href: "#" },
            { title: "Alert System", href: "#" },
            { title: "Telegram Bot", href: "#" },
            { title: "Documentation", href: "https://docs.somnia.network/developer/reactivity", external: true },
        ],
    },
    {
        label: "Ecosystem",
        links: [
            { title: "Somnia Network", href: "https://somnia.network", external: true },
            { title: "Reactivity Docs", href: "https://docs.somnia.network/developer/reactivity", external: true },
            { title: "Somnia Explorer", href: "https://explorer.somnia.network", external: true },
            { title: "Somnia Faucet", href: "https://faucet.somnia.network", external: true },
        ],
    },
    {
        label: "Resources",
        links: [
            { title: "GitHub", href: "https://github.com", external: true },
            { title: "Smart Contracts", href: "#" },
            { title: "API Reference", href: "#" },
            { title: "Hackathon", href: "https://somnia.network", external: true },
        ],
    },
];

/* ─── Animated Container ────────────────────────────────────── */

type ViewAnimationProps = {
    delay?: number;
    className?: string;
    style?: React.CSSProperties;
    children: ReactNode;
};

function AnimatedContainer({ className, delay = 0.1, children, style }: ViewAnimationProps) {
    const shouldReduceMotion = useReducedMotion();

    if (shouldReduceMotion) {
        return <div className={className}>{children}</div>;
    }

    return (
        <motion.div
            initial={{ filter: "blur(4px)", translateY: -8, opacity: 0 }}
            whileInView={{ filter: "blur(0px)", translateY: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay, duration: 0.8 }}
            className={className}
            style={style}
        >
            {children}
        </motion.div>
    );
}

/* ─── Footer Component ──────────────────────────────────────── */

export function Footer() {
    return (
        <footer className="cw-footer">
            {/* High-end Diagonal Stripes Background */}
            <BGPattern
                variant="diagonal-stripes"
                fill="rgba(255, 255, 255, 0.061)"
                size={20}
                className="cw-footer-pattern"
            />
            {/* Subtle top glow line */}
            <div className="cw-footer-glow" />

            <div className="cw-footer-inner" style={{ position: 'relative', zIndex: 10 }}>
                {/* Brand Column */}
                <AnimatedContainer className="cw-footer-brand" style={{ position: 'relative', zIndex: 10 }}>
                    <div className="cw-footer-logo">
                        <img src="/logo.png" alt="ChainWatch" className="cw-footer-logo-img" />
                    </div>
                    <p className="cw-footer-tagline">
                        Trustless on-chain alerts powered by Somnia Reactivity.
                        No polling. No backend. The chain watches itself.
                    </p>
                    <p className="cw-footer-network">
                        <span className="cw-footer-network-dot" />
                        Somnia Testnet • Chain ID: 50312
                    </p>
                </AnimatedContainer>

                {/* Link Columns */}
                <div className="cw-footer-links">
                    {footerSections.map((section, index) => (
                        <AnimatedContainer key={section.label} delay={0.1 + index * 0.1}>
                            <div className="cw-footer-section">
                                <h3 className="cw-footer-section-label">{section.label}</h3>
                                <ul className="cw-footer-section-list">
                                    {section.links.map((link) => (
                                        <li key={link.title}>
                                            <a
                                                href={link.href}
                                                className="cw-footer-link"
                                                {...(link.external
                                                    ? { target: "_blank", rel: "noopener noreferrer" }
                                                    : {})}
                                            >
                                                {link.title}
                                                {link.external && (
                                                    <span className="cw-footer-link-arrow">↗</span>
                                                )}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </AnimatedContainer>
                    ))}
                </div>
            </div>

            {/* Bottom Bar */}
            <div className="cw-footer-bottom">
                <p>© {new Date().getFullYear()} ChainWatch. Built for the Somnia Reactivity Hackathon.</p>
            </div>
        </footer>
    );
}
