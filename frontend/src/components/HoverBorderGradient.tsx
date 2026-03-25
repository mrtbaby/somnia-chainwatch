import React, { useState, useEffect } from "react";
import { motion } from "motion/react";

type Direction = "TOP" | "LEFT" | "BOTTOM" | "RIGHT";

const movingMap: Record<Direction, string> = {
    TOP: "radial-gradient(20.7% 50% at 50% 0%, hsl(0, 0%, 100%) 0%, rgba(255, 255, 255, 0) 100%)",
    LEFT: "radial-gradient(16.6% 43.1% at 0% 50%, hsl(0, 0%, 100%) 0%, rgba(255, 255, 255, 0) 100%)",
    BOTTOM: "radial-gradient(20.7% 50% at 50% 100%, hsl(0, 0%, 100%) 0%, rgba(255, 255, 255, 0) 100%)",
    RIGHT: "radial-gradient(16.2% 41.1% at 100% 50%, hsl(0, 0%, 100%) 0%, rgba(255, 255, 255, 0) 100%)",
};

const highlight = "radial-gradient(75% 181.1% at 50% 50%, #3275F8 0%, rgba(255, 255, 255, 0) 100%)";

export function HoverBorderGradient({
    children,
    className = "",
    duration = 1,
    clockwise = true,
    ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    duration?: number;
    clockwise?: boolean;
}) {
    const [hovered, setHovered] = useState<boolean>(false);
    const [direction, setDirection] = useState<Direction>("BOTTOM");

    const rotateDirection = (currentDirection: Direction): Direction => {
        const directions: Direction[] = ["TOP", "LEFT", "BOTTOM", "RIGHT"];
        const currentIndex = directions.indexOf(currentDirection);
        const nextIndex = clockwise
            ? (currentIndex - 1 + directions.length) % directions.length
            : (currentIndex + 1) % directions.length;
        return directions[nextIndex];
    };

    useEffect(() => {
        if (!hovered) {
            const interval = setInterval(() => {
                setDirection((prevState) => rotateDirection(prevState));
            }, duration * 1000);
            return () => clearInterval(interval);
        }
    }, [hovered, duration, clockwise]);

    return (
        <button
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            className={`hover-border-gradient ${className}`}
            {...props}
        >
            <div className="hover-border-gradient-inner">
                {children}
            </div>
            <div className="hover-border-gradient-bg">
                <motion.div
                    className="hover-border-gradient-bg-moving"
                    initial={{ background: movingMap[direction] }}
                    animate={{
                        background: hovered
                            ? [movingMap[direction], highlight]
                            : movingMap[direction],
                    }}
                    transition={{ ease: "linear", duration: duration ?? 1 }}
                />
            </div>
            <div className="hover-border-gradient-inset" />
        </button>
    );
}
