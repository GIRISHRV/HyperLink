export function GlobalFooter() {
    return (
        <footer className="mt-auto relative">
            {/* Colorful Strip */}
            <div className="flex h-1 w-full opacity-50">
                <div className="flex-1 bg-bauhaus-blue"></div>
                <div className="flex-1 bg-bauhaus-red"></div>
                <div className="flex-1 bg-primary"></div>
            </div>

            {/* Footer Content */}
            <div className="bg-surface-preview py-6 px-4 border-t border-subtle">
                <div className="max-w-[1440px] mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
                    {/* Center: Logo */}
                    <div className="flex items-center gap-1 justify-center">
                        <span className="font-black text-xl tracking-tighter text-white uppercase whitespace-nowrap">HYPERLINK</span>
                    </div>
                    <div className="flex flex-col md:items-end">
                        <div className="text-xs text-white/30 font-mono tracking-widest">
                            E2E ENCRYPTED P2P TRANSFER
                        </div>
                        <div className="text-[10px] text-white/20 font-mono mt-1">
                            v{process.env.NEXT_PUBLIC_APP_VERSION || "0.0.0"}
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}
