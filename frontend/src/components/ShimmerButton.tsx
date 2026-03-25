import React from "react";

/* ─── Shimmer Button ────────────────────────────────────────── */
/* CSS-only shimmer animation — no Tailwind dependency.          */
/* The shimmer keyframes are defined in App.css.                 */

interface ShimmerButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    children?: React.ReactNode;
    variant?: "dark" | "light";
}

export function ShimmerButton({
    children = "Get Started",
    variant = "dark",
    className = "",
    ...props
}: ShimmerButtonProps) {
    return (
        <button
            className={`shimmer-btn shimmer-btn--${variant} ${className}`}
            {...props}
        >
            {children}
        </button>
    );
}
