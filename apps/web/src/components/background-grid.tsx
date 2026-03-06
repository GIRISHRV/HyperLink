"use client";

import { useEffect, useRef } from "react";

export default function BackgroundGrid() {
    const gridRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!gridRef.current) return;
            // Normalize mouse position to -1 to 1 based on center of screen
            const x = (e.clientX / window.innerWidth) * 2 - 1;
            const y = (e.clientY / window.innerHeight) * 2 - 1;
            gridRef.current.style.setProperty("--mouse-x", x.toString());
            gridRef.current.style.setProperty("--mouse-y", y.toString());
        };

        window.addEventListener("mousemove", handleMouseMove);
        return () => window.removeEventListener("mousemove", handleMouseMove);
    }, []);

    return (
        <div
            ref={gridRef}
            className="fixed inset-0 z-0 pointer-events-none overflow-hidden select-none bg-surface-deep transition-opacity duration-1000"
        >
            {/* 1. Base Dot Grid */}
            <div className="absolute inset-0 bg-[radial-gradient(#444_1px,transparent_1px)] [background-size:32px_32px] opacity-[0.1]" />

            {/* 2. Secondary Large Grid Lines */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:128px_128px]" />

            {/* 3. Vignette Layer */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#0a0a0a_90%)] opacity-60" />

            {/* 4. Interactive Blurred Shapes */}
            <div
                className="absolute -bottom-32 -left-32 w-[600px] h-[600px] bg-primary rounded-full blur-[100px] opacity-[0.05] transition-transform duration-100 ease-out animate-blob"
                style={{ transform: `translate(calc(var(--mouse-x, 0) * 30px), calc(var(--mouse-y, 0) * 30px))` }}
            />
            <div
                className="absolute -top-20 -right-20 w-[600px] h-[600px] bg-bauhaus-blue opacity-[0.05] blur-[80px] transition-transform duration-100 ease-out animate-blob animation-delay-2000"
                style={{ transform: `translate(calc(var(--mouse-x, 0) * -40px), calc(var(--mouse-y, 0) * -20px))` }}
            />
            <div
                className="absolute top-1/2 left-1/3 w-[400px] h-[400px] bg-primary opacity-[0.03] blur-[90px] transition-transform duration-100 ease-out animate-blob animation-delay-4000"
                style={{ transform: `translate(calc(var(--mouse-x, 0) * 20px), calc(var(--mouse-y, 0) * -30px))` }}
            />

            {/* 5. Floating Labels and Structural Aesthetics */}
            <div
                className="absolute top-[18%] left-[12%] text-white/20 font-mono text-xs transition-transform duration-100 ease-out"
                style={{ transform: `translate(calc(var(--mouse-x, 0) * 15px), calc(var(--mouse-y, 0) * 15px))` }}
            >
                SYS_01
            </div>
            <div
                className="absolute top-[25%] right-[8%] text-white/20 font-mono text-xs transition-transform duration-100 ease-out"
                style={{ transform: `translate(calc(var(--mouse-x, 0) * -20px), calc(var(--mouse-y, 0) * 10px))` }}
            >
                PROTOCOL_v2
            </div>
            <div
                className="absolute bottom-[20%] left-[25%] text-white/15 font-mono text-xs transition-transform duration-100 ease-out hidden md:block"
                style={{ transform: `translate(calc(var(--mouse-x, 0) * 10px), calc(var(--mouse-y, 0) * -15px))` }}
            >
                AES_256
            </div>
            <div
                className="absolute bottom-[25%] right-[20%] text-white/15 font-mono text-xs transition-transform duration-100 ease-out"
                style={{ transform: `translate(calc(var(--mouse-x, 0) * -15px), calc(var(--mouse-y, 0) * -25px))` }}
            >
                PEER_MESH
            </div>

            {/* Minimal floating geometric shapes */}
            <div
                className="absolute top-[6%] left-[55%] text-white/10 font-black text-4xl transition-transform duration-100 ease-out pointer-events-none"
                style={{ transform: `translate(calc(var(--mouse-x, 0) * 25px), calc(var(--mouse-y, 0) * 5px))` }}
            >
                +
            </div>
            <div
                className="absolute bottom-[15%] right-[10%] text-white/5 text-9xl font-thin select-none pointer-events-none transition-transform duration-100 ease-out"
                style={{ transform: `translate(calc(var(--mouse-x, 0) * -30px), calc(var(--mouse-y, 0) * -10px))` }}
            >
                +
            </div>
            <div
                className="absolute top-[45%] left-[8%] w-16 h-16 border border-white/10 rounded-full transition-transform duration-100 ease-out hidden md:block"
                style={{ transform: `translate(calc(var(--mouse-x, 0) * 10px), calc(var(--mouse-y, 0) * 20px))` }}
            />
            <div
                className="absolute bottom-[25%] left-[15%] w-32 h-32 border border-dashed border-white/10 rounded-full transition-transform duration-100 ease-out"
                style={{ transform: `translate(calc(var(--mouse-x, 0) * 35px), calc(var(--mouse-y, 0) * -5px))` }}
            />
        </div>
    );
}
