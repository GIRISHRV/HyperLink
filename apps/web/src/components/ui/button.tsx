import * as React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
    size?: "default" | "sm" | "lg" | "icon";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className = "", variant = "default", size = "default", ...props }, ref) => {
        let classes = "inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border-2 rounded-xl border-surface-subtle font-bold uppercase tracking-wider backdrop-blur-sm relative overflow-hidden group hover:scale-[1.02] active:scale-[0.98]";

        if (variant === "default") classes += " bg-primary text-black border-black/10 hover:bg-primary/90 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]";
        else if (variant === "destructive") classes += " bg-bauhaus-red text-white border-white/10 hover:bg-bauhaus-red/90 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)]";
        else if (variant === "outline") classes += " border border-surface-subtle bg-transparent text-white hover:bg-surface-elevated hover:text-white shadow-[4px_4px_0px_0px_rgba(255,255,255,0.05)]";
        else if (variant === "secondary") classes += " bg-surface-elevated text-white hover:bg-surface-elevated/80 border-surface-subtle shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)]";
        else if (variant === "ghost") classes += " hover:bg-surface-elevated hover:text-white border-transparent";
        else if (variant === "link") classes += " text-primary underline-offset-4 hover:underline border-transparent shadow-none";

        if (size === "default") classes += " h-9 px-4 py-2";
        else if (size === "sm") classes += " h-8 px-3 text-xs rounded-lg";
        else if (size === "lg") classes += " h-14 px-8 py-3 text-base rounded-2xl";
        else if (size === "icon") classes += " h-9 w-9";

        classes += " " + className;

        return (
            <button
                className={classes}
                ref={ref}
                {...props}
            />
        );
    }
);
Button.displayName = "Button";

export { Button };
