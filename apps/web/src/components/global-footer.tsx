export function GlobalFooter() {
    return (
        <footer className="mt-auto relative z-[50]">
            {/* Colorful Strip */}
            <div className="flex h-1 w-full opacity-50">
                <div className="flex-1 bg-bauhaus-blue"></div>
                <div className="flex-1 bg-bauhaus-red"></div>
                <div className="flex-1 bg-primary"></div>
            </div>

            {/* Footer Content */}
            <div className="bg-surface-preview py-6 px-4 border-t border-subtle">
                <div className="max-w-[1440px] mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center justify-center md:justify-start gap-1">
                        <span className="font-black text-sm tracking-tighter uppercase text-white/50">HYPER</span>
                        <span className="font-black text-sm tracking-tighter uppercase text-white/20">LINK</span>
                    </div>
                    <div className="text-xs text-white/30 font-mono">
                        E2E ENCRYPTED P2P TRANSFER
                    </div>
                </div>
            </div>
        </footer>
    );
}
