import React from "react";

interface ProgressBarProps {
    percentage: number;
    isPaused: boolean;
    speed: number;
    formatFileSize: (bytes: number) => string;
    formatTime: (seconds: number) => string;
    timeRemaining: number;
}

export function ProgressBar({
    percentage,
    isPaused,
    speed,
    formatFileSize,
    formatTime,
    timeRemaining,
}: ProgressBarProps) {
    const particles = React.useMemo(() => {
        return Array.from({ length: 8 }, (_, i) => ({
            id: i,
            left: `${(i * 12) + 5}%`,
            delay: `${i * 0.2}s`,
            shape: ["circle", "square", "triangle"][i % 3],
            color: ["bg-primary", "bg-bauhaus-blue", "bg-bauhaus-red"][i % 3],
        }));
    }, []);

    return (
        <div className="relative z-10 py-4">
            <div className="flex justify-between text-[10px] font-mono text-[#bcb89a] mb-2 uppercase tracking-widest">
                <span>Transmission Speed: {formatFileSize(speed)}/s</span>
                <span>ETA: {formatTime(timeRemaining)}</span>
            </div>

            <div className="h-4 w-full bg-[#1a1a1a] border border-[#3a3827] p-[2px] relative overflow-hidden">
                <div
                    className={`h-full ${isPaused ? "bg-orange-400" : "bg-primary"
                        } relative overflow-hidden transition-all duration-300`}
                    style={{ width: `${percentage}%` }}
                >
                    {!isPaused && (
                        <div
                            className="absolute inset-0 opacity-30"
                            style={{
                                background:
                                    "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.6) 50%, transparent 100%)",
                                backgroundSize: "200% 100%",
                                animation: "wave-shimmer 2s linear infinite",
                            }}
                        />
                    )}

                    {!isPaused && (
                        <div className="absolute inset-0 bg-[linear-gradient(-45deg,rgba(0,0,0,0.15)_25%,transparent_25%,transparent_50%,rgba(0,0,0,0.15)_50%,rgba(0,0,0,0.15)_75%,transparent_75%,transparent)] bg-[length:8px_8px] animate-[progress-stripes_1s_linear_infinite]" />
                    )}

                    {!isPaused &&
                        percentage > 10 &&
                        particles.map((particle) => (
                            <div
                                key={particle.id}
                                className="absolute top-1/2 -translate-y-1/2"
                                style={{
                                    left: particle.left,
                                    animationDelay: particle.delay,
                                }}
                            >
                                {particle.shape === "circle" && (
                                    <div
                                        className={`size-1 ${particle.color} rounded-full opacity-60 animate-[particle-float_3s_ease-in-out_infinite]`}
                                    />
                                )}
                                {particle.shape === "square" && (
                                    <div
                                        className={`size-1 ${particle.color} opacity-60 animate-[particle-float_3s_ease-in-out_infinite]`}
                                    />
                                )}
                                {particle.shape === "triangle" && (
                                    <div
                                        className={`size-1 ${particle.color} opacity-60 shape-triangle animate-[particle-float_3s_ease-in-out_infinite]`}
                                    />
                                )}
                            </div>
                        ))}

                    {!isPaused && percentage > 5 && percentage < 100 && (
                        <div
                            className="absolute right-0 top-0 bottom-0 w-1 bg-white/50 animate-[progress-glow_2s_ease-in-out_infinite]"
                            style={{
                                filter: "blur(2px)",
                            }}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
