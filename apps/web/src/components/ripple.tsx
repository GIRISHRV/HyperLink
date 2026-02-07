"use client";

import React, { useState, useLayoutEffect, MouseEvent } from "react";

interface RippleProps {
    color?: string;
    duration?: number;
}

export function Ripple({ color = "rgba(255, 255, 255, 0.3)", duration = 600 }: RippleProps) {
    const [rippleArray, setRippleArray] = useState<
        { x: number; y: number; size: number }[]
    >([]);

    useLayoutEffect(() => {
        let bounce: NodeJS.Timeout;
        if (rippleArray.length > 0) {
            bounce = setTimeout(() => {
                setRippleArray([]);
            }, duration * 2);
        }
        return () => clearTimeout(bounce);
    }, [rippleArray.length, duration]);

    const addRipple = (event: MouseEvent<HTMLDivElement>) => {
        const rippleContainer = event.currentTarget.getBoundingClientRect();
        const size =
            rippleContainer.width > rippleContainer.height
                ? rippleContainer.width
                : rippleContainer.height;
        const x = event.clientX - rippleContainer.left - size / 2;
        const y = event.clientY - rippleContainer.top - size / 2;
        const newRipple = {
            x,
            y,
            size,
        };

        setRippleArray((prevState) => [...prevState, newRipple]);
    };

    return (
        <div
            aria-hidden="true"
            onMouseDown={addRipple}
            className="absolute inset-0 rounded-[inherit] overflow-hidden cursor-pointer"
        >
            {rippleArray.map((ripple, index) => {
                return (
                    <span
                        key={"span" + index}
                        style={{
                            top: ripple.y,
                            left: ripple.x,
                            width: ripple.size,
                            height: ripple.size,
                            backgroundColor: color,
                            animationDuration: `${duration}ms`,
                        }}
                        className="absolute rounded-full opacity-75 scale-0 animate-ripple pointer-events-none"
                    />
                );
            })}
        </div>
    );
}
