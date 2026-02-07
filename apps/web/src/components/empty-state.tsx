import Link from "next/link";
import React from "react";

interface EmptyStateProps {
    icon?: string;
    title: string;
    description: string;
    actionLabel?: string;
    actionLink?: string;
}

export function EmptyState({
    icon = "inbox",
    title,
    description,
    actionLabel,
    actionLink,
}: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center animate-in fade-in zoom-in-95 duration-500">
            {/* Bauhaus-inspired Geometric Background */}
            <div className="relative mb-8">
                <div className="absolute top-0 right-0 -mr-4 -mt-4 w-16 h-16 bg-bauhaus-blue/10 rounded-full blur-xl animate-pulse"></div>
                <div className="absolute bottom-0 left-0 -ml-4 -mb-4 w-16 h-16 bg-bauhaus-red/10 rounded-full blur-xl animate-pulse delay-75"></div>

                <div className="relative z-10 size-24 bg-[#242424] rounded-full border border-white/10 flex items-center justify-center shadow-xl group">
                    <div className="absolute inset-0 bg-primary/5 rounded-full scale-0 group-hover:scale-110 transition-transform duration-500 rounded-full"></div>
                    <span className="material-symbols-outlined text-5xl text-gray-500 group-hover:text-primary transition-colors duration-300">
                        {icon}
                    </span>

                    {/* Decorative geometric shapes */}
                    <div className="absolute -top-2 -right-2 size-6 bg-primary rounded-full border-4 border-[#1a1a1a]"></div>
                    <div className="absolute -bottom-1 -left-1 size-4 bg-bauhaus-blue rounded-sm transform rotate-12"></div>
                </div>
            </div>

            <h3 className="text-xl font-black uppercase tracking-tight text-white mb-2">
                {title}
            </h3>

            <p className="text-gray-400 max-w-sm mb-8 leading-relaxed">
                {description}
            </p>

            {actionLabel && actionLink && (
                <Link href={actionLink}>
                    <button className="group relative px-6 py-3 bg-transparent border border-white/20 hover:border-primary text-white hover:text-primary font-bold uppercase tracking-widest text-xs transition-all duration-300 overflow-hidden">
                        <span className="relative z-10 flex items-center gap-2">
                            {actionLabel}
                            <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">
                                arrow_forward
                            </span>
                        </span>
                        <div className="absolute inset-0 bg-white/5 transform -translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out origin-left"></div>
                    </button>
                </Link>
            )}
        </div>
    );
}
