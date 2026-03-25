/* ─── Dot Pattern Background ────────────────────────────────── */
/* Pure CSS dot pattern with fade-edges mask to soften the white. */

interface DotPatternProps {
    size?: number;
    fill?: string;
    className?: string;
}

export function DotPattern({
    size = 24,
    fill = "rgba(0, 0, 0, 0.12)",
    className = "",
}: DotPatternProps) {
    return (
        <div
            className={`dot-pattern ${className}`}
            style={{
                backgroundImage: `radial-gradient(${fill} 1px, transparent 1px)`,
                backgroundSize: `${size}px ${size}px`,
            }}
        />
    );
}
