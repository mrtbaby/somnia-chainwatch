import { motion } from "motion/react";

/* ─── Elegant Floating Shape ────────────────────────────────── */

interface ElegantShapeProps {
    className?: string;
    delay?: number;
    width?: number;
    height?: number;
    rotate?: number;
    gradient?: string;
}

function ElegantShape({
    className = "",
    delay = 0,
    width = 400,
    height = 100,
    rotate = 0,
    gradient = "rgba(124, 58, 237, 0.06)",
}: ElegantShapeProps) {
    return (
        <motion.div
            initial={{
                opacity: 0,
                y: -150,
                rotate: rotate - 15,
            }}
            animate={{
                opacity: 1,
                y: 0,
                rotate: rotate,
            }}
            transition={{
                duration: 2.4,
                delay,
                ease: [0.23, 0.86, 0.39, 0.96],
                opacity: { duration: 1.2 },
            }}
            className={`elegant-shape ${className}`}
        >
            <motion.div
                animate={{
                    y: [0, 15, 0],
                    rotate: [0, 10, 0],
                }}
                transition={{
                    duration: 12,
                    repeat: Infinity,
                    ease: "easeInOut",
                }}
                style={{ width, height }}
                className="elegant-shape-inner"
            >
                <div
                    className="elegant-shape-pill"
                    style={{
                        background: `linear-gradient(to right, ${gradient}, transparent)`,
                    }}
                />
            </motion.div>
        </motion.div>
    );
}

/* ─── Hero Background ───────────────────────────────────────── */

export function HeroBackground() {
    return (
        <div className="hero-bg-shapes">
            <ElegantShape
                delay={0.3}
                width={900}
                height={210}
                rotate={12}
                gradient="rgba(124, 58, 237, 0.15)"
                className="hero-shape-1"
            />

            <ElegantShape
                delay={0.5}
                width={750}
                height={180}
                rotate={-15}
                gradient="rgba(167, 139, 250, 0.15)"
                className="hero-shape-2"
            />

            <ElegantShape
                delay={0.4}
                width={450}
                height={120}
                rotate={-8}
                gradient="rgba(124, 58, 237, 0.12)"
                className="hero-shape-3"
            />

            <ElegantShape
                delay={0.6}
                width={300}
                height={90}
                rotate={20}
                gradient="rgba(167, 139, 250, 0.12)"
                className="hero-shape-4"
            />

            <ElegantShape
                delay={0.7}
                width={225}
                height={60}
                rotate={-25}
                gradient="rgba(124, 58, 237, 0.10)"
                className="hero-shape-5"
            />
        </div>
    );
}
