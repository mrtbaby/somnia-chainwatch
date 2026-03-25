import React, { useId } from "react";
import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { Zap, Shield, Send, Eye, Clock, Link } from "lucide-react";

/* ─── Types ─────────────────────────────────────────────────── */

type FeatureType = {
    title: string;
    icon: React.ComponentType<React.SVGProps<SVGSVGElement> & { size?: number | string }>;
    description: string;
};

/* ─── Grid Pattern SVG ──────────────────────────────────────── */

function GridPattern({
    width,
    height,
    x,
    y,
    squares,
    ...props
}: React.SVGProps<SVGSVGElement> & {
    width: number;
    height: number;
    x: string;
    y: string;
    squares?: number[][];
}) {
    const patternId = useId();

    return (
        <svg aria-hidden="true" {...props}>
            <defs>
                <pattern
                    id={patternId}
                    width={width}
                    height={height}
                    patternUnits="userSpaceOnUse"
                    x={x}
                    y={y}
                >
                    <path d={`M.5 ${height}V.5H${width}`} fill="none" />
                </pattern>
            </defs>
            <rect width="100%" height="100%" strokeWidth={0} fill={`url(#${patternId})`} />
            {squares && (
                <svg x={x} y={y} style={{ overflow: "visible" }}>
                    {squares.map(([sx, sy], index) => (
                        <rect
                            strokeWidth="0"
                            key={index}
                            width={width + 1}
                            height={height + 1}
                            x={sx * width}
                            y={sy * height}
                        />
                    ))}
                </svg>
            )}
        </svg>
    );
}

function genRandomPattern(length = 5): number[][] {
    return Array.from({ length }, () => [
        Math.floor(Math.random() * 4) + 7,
        Math.floor(Math.random() * 6) + 1,
    ]);
}

/* ─── Feature Card ──────────────────────────────────────────── */

function FeatureCard({ feature }: { feature: FeatureType }) {
    const p = genRandomPattern();
    const IconComponent = feature.icon;

    return (
        <div className="feature-card">
            <div className="feature-card-pattern">
                <div className="feature-card-pattern-gradient">
                    <GridPattern
                        width={20}
                        height={20}
                        x="-12"
                        y="4"
                        squares={p}
                        className="feature-card-grid-svg"
                    />
                </div>
            </div>
            <IconComponent className="feature-card-icon" size={24} strokeWidth={1.5} aria-hidden />
            <h3 className="feature-card-title">{feature.title}</h3>
            <p className="feature-card-desc">{feature.description}</p>
        </div>
    );
}

/* ─── Animated Container ────────────────────────────────────── */

type ViewAnimationProps = {
    delay?: number;
    className?: string;
    children: ReactNode;
};

function AnimatedContainer({ className, delay = 0.1, children }: ViewAnimationProps) {
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
        >
            {children}
        </motion.div>
    );
}

/* ─── Features Section ──────────────────────────────────────── */

const features: FeatureType[] = [
    {
        title: "Sub-second Delivery",
        icon: Zap,
        description:
            "Alerts fire at the block level through Somnia Reactivity — no delays, no polling intervals.",
    },
    {
        title: "Trustless & On-chain",
        icon: Shield,
        description:
            "Alert subscriptions live on the Somnia blockchain — not on centralized servers.",
    },
    {
        title: "Telegram Notifications",
        icon: Send,
        description:
            "Link your wallet once and receive real-time push alerts directly in Telegram.",
    },
    {
        title: "Watch Any Wallet",
        icon: Eye,
        description:
            "Monitor transfers in and out of any address for any ERC-20 token on Somnia.",
    },
    {
        title: "Zero Infrastructure",
        icon: Clock,
        description:
            "No backend required. The chain's native pub/sub handles everything natively.",
    },
    {
        title: "Multi-chain Ready",
        icon: Link,
        description:
            "Built on Somnia Testnet today, designed to scale with the Somnia ecosystem.",
    },
];

export function FeaturesSection() {
    return (
        <section className="features-section">
            <AnimatedContainer className="features-header">
                <h2 className="features-headline">
                    Power. Speed. Control.
                </h2>
                <p className="features-subline">
                    Everything you need for trustless on-chain alerting.
                </p>
            </AnimatedContainer>

            <AnimatedContainer delay={0.4} className="features-grid">
                {features.map((feature, i) => (
                    <FeatureCard key={i} feature={feature} />
                ))}
            </AnimatedContainer>
        </section>
    );
}
