import { MeshGradient } from "@paper-design/shaders-react";
import { BGPattern } from "./BGPattern";
import { motion } from "motion/react";

export function ShaderBackground() {
    return (
        <div className="fixed inset-0 z-[-1] overflow-hidden bg-black pointer-events-none">
            {/* SVG Filters from shader.txt */}
            <svg className="absolute inset-0 w-0 h-0">
                <defs>
                    <filter id="glass-effect" x="-50%" y="-50%" width="200%" height="200%">
                        <feTurbulence baseFrequency="0.005" numOctaves="1" result="noise" />
                        <feDisplacementMap in="SourceGraphic" in2="noise" scale="0.3" />
                        <feColorMatrix
                            type="matrix"
                            values="1 0 0 0 0.02
                                    0 1 0 0 0.02
                                    0 0 1 0 0.05
                                    0 0 0 0.9 0"
                            result="tint"
                        />
                    </filter>
                    <filter id="gooey-filter" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
                        <feColorMatrix
                            in="blur"
                            mode="matrix"
                            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -9"
                            result="gooey"
                        />
                        <feComposite in="SourceGraphic" in2="gooey" operator="atop" />
                    </filter>
                </defs>
            </svg>

            {/* Base Mesh Gradient Layer */}
            <MeshGradient
                className="absolute inset-0 w-full h-full"
                colors={["#000000", "#7C3AED", "#06B6D4", "#F97316", "#000000"]}
                speed={0.3}
                // @ts-ignore - Prop existence depends on library version
                backgroundColor="#000000"
            />

            {/* Wireframe Overlay Layer (Adds technical texture) */}
            <MeshGradient
                className="absolute inset-0 w-full h-full opacity-30"
                colors={["#000000", "#ffffff", "#06B6D4", "#F97316"]}
                speed={0.2}
                // @ts-ignore
                wireframe="true"
                // @ts-ignore
                backgroundColor="transparent"
            />
            
            {/* Blueprint Grid Overlay (8% white) */}
            <BGPattern 
                variant="grid" 
                fill="rgba(255, 255, 255, 0.08)" 
                size={24} 
            />
            
            {/* Dark vignette to focus the center */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.5)_100%)]" />
        </div>
    );
}
