"use client";

import { useEffect, useState } from "react";

export default function BackgroundGrid() {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    return (
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden select-none bg-[#0a0a0a]">
            {/* 1. Base Dot Grid */}
            <div className="absolute inset-0 bg-[radial-gradient(#444_1px,transparent_1px)] [background-size:32px_32px] opacity-[0.1]" />

            {/* 2. Secondary Large Grid Lines */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:128px_128px]" />

            {/* 3. Vignette Layer */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#0a0a0a_90%)] opacity-60" />

            {/* 4. Large Blurred Shapes (Static, no pulsing) */}
            <div className="absolute -bottom-32 -left-32 w-[600px] h-[600px] bg-primary rounded-full opacity-[0.04] blur-[100px]" />
            <div className="absolute -top-20 -right-20 w-[600px] h-[600px] bg-bauhaus-blue rotate-12 opacity-[0.04] blur-[80px]" />
            <div className="absolute top-1/2 -right-32 w-[500px] h-[500px] bg-bauhaus-red opacity-[0.03] blur-[90px]" style={{ clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)" }} />
            <div className="absolute top-[20%] left-[20%] w-[300px] h-[300px] bg-purple-500/5 rounded-full blur-[60px]" />

            {/* 5. High Density Geometric Swarm */}

            {/* Top Left Quadrant */}
            <div className="absolute top-[10%] left-[5%] w-3 h-3 bg-primary/20" />
            <div className="absolute top-[12%] left-[8%] w-2 h-2 bg-white/10" />
            <div className="absolute top-[15%] left-[4%] w-24 h-24 border border-white/5 rounded-full" />
            <div className="absolute top-[18%] left-[12%] text-white/5 font-mono text-[10px]">SYS_01</div>
            <div className="absolute top-[8%] left-[15%] w-16 h-[1px] bg-white/10" />
            <div className="absolute top-[25%] left-[6%] w-4 h-4 border border-primary/20 rotate-45" />

            {/* Top Center */}
            <div className="absolute top-[5%] left-[40%] w-[1px] h-12 bg-white/10" />
            <div className="absolute top-[5%] left-[60%] w-[1px] h-12 bg-white/10" />
            <div className="absolute top-[8%] left-[45%] w-4 h-4 bg-bauhaus-blue/10 rounded-sm" />
            <div className="absolute top-[6%] left-[55%] text-white/5 font-black text-4xl">+</div>

            {/* Top Right Quadrant */}
            <div className="absolute top-[15%] right-[10%] w-32 h-32 border border-dashed border-white/5 rounded-full" />
            <div className="absolute top-[20%] right-[15%] w-4 h-4 bg-bauhaus-red/20 rotate-12" />
            <div className="absolute top-[10%] right-[5%] w-2 h-2 bg-white/10" />
            <div className="absolute top-[25%] right-[8%] text-white/5 font-mono text-xs">NON_SECURE</div>
            <div className="absolute top-[30%] right-[12%] w-12 h-12 border border-white/5 rotate-45" />

            {/* Center Left */}
            <div className="absolute top-[40%] left-[2%] w-8 h-[1px] bg-primary/20" />
            <div className="absolute top-[42%] left-[2%] w-4 h-[1px] bg-primary/20" />
            <div className="absolute top-[45%] left-[8%] w-16 h-16 border border-white/5 rounded-full opacity-50" />
            <div className="absolute top-[50%] left-[5%] text-white/5 text-6xl font-thin opacity-10">×</div>

            {/* Center Right */}
            <div className="absolute top-[45%] right-[5%] w-20 h-20 border-l border-t border-white/10" />
            <div className="absolute top-[55%] right-[8%] w-2 h-2 bg-primary/20 rounded-full" />
            <div className="absolute top-[60%] right-[3%] w-[1px] h-24 bg-gradient-to-b from-transparent via-white/10 to-transparent" />

            {/* Bottom Left Quadrant */}
            <div className="absolute bottom-[20%] left-[10%] w-48 h-48 border border-white/5 rounded-full" />
            <div className="absolute bottom-[25%] left-[15%] w-32 h-32 border border-dashed border-white/5 rounded-full opacity-50" />
            <div className="absolute bottom-[15%] left-[5%] w-4 h-4 bg-white/5" />
            <div className="absolute bottom-[10%] left-[12%] text-white/5 font-mono text-[10px]">A-74</div>
            <div className="absolute bottom-[30%] left-[8%] w-2 h-12 bg-bauhaus-blue/5" />

            {/* Bottom Center */}
            <div className="absolute bottom-[5%] left-[30%] w-24 h-[1px] bg-white/5" />
            <div className="absolute bottom-[8%] right-[40%] w-4 h-4 border border-white/10 rotate-45" />
            <div className="absolute bottom-[10%] left-[50%] w-[1px] h-8 bg-primary/20" />

            {/* Bottom Right Quadrant */}
            <div className="absolute bottom-[15%] right-[10%] text-white/5 text-9xl font-thin opacity-20 select-none">+</div>
            <div className="absolute bottom-[25%] right-[20%] w-12 h-12 bg-bauhaus-red/5 rounded-full" />
            <div className="absolute bottom-[10%] right-[5%] w-3 h-3 bg-white/10" />
            <div className="absolute bottom-[30%] right-[5%] w-[1px] h-32 bg-white/10" />
            <div className="absolute bottom-[20%] right-[15%] w-6 h-6 border border-primary/10" />

            {/* Random Small Particles */}
            <div className="absolute top-[33%] left-[22%] w-1 h-1 bg-white/20" />
            <div className="absolute top-[67%] right-[33%] w-1 h-1 bg-white/20" />
            <div className="absolute bottom-[44%] left-[44%] w-1 h-1 bg-white/20" />
            <div className="absolute top-[88%] right-[11%] w-1 h-1 bg-white/20" />

            {/* Decorative Border Lines */}
            <div className="absolute top-0 left-12 h-screen w-[1px] bg-gradient-to-b from-transparent via-white/10 to-transparent" />
            <div className="absolute top-0 right-12 h-screen w-[1px] bg-gradient-to-b from-transparent via-white/10 to-transparent" />
            <div className="absolute top-24 left-0 w-screen h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            <div className="absolute bottom-24 left-0 w-screen h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </div>
    );
}
