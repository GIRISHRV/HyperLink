"use client";

import Link from "next/link";

export default function AboutPage() {
    return (
        <div className="bg-[#121212] min-h-screen text-white">
            {/* Header/Nav */}
            <nav className="w-full flex border-b border-[#333]">
                <div className="bg-primary text-[#121212] px-8 py-6 flex items-center min-w-[200px]">
                    <Link href="/" className="font-black text-4xl tracking-tighter uppercase">
                        HYPER
                    </Link>
                </div>
                <div className="flex-1 bg-[#121212] flex items-center justify-between px-8 py-4">
                    <Link href="/" className="font-black text-4xl tracking-tighter uppercase text-white">
                        LINK
                    </Link>
                    <Link href="/dashboard">
                        <button className="h-12 px-6 bg-primary text-black text-sm font-bold uppercase tracking-wide hover:bg-yellow-400 transition-colors">
                            Dashboard
                        </button>
                    </Link>
                </div>
            </nav>

            {/* Hero Section */}
            <div className="max-w-5xl mx-auto px-6 py-20">
                <div className="flex items-center gap-2 mb-6">
                    <div className="h-1 w-12 bg-bauhaus-blue" />
                    <span className="text-xs font-bold uppercase tracking-widest text-gray-500">
                        About HyperLink
                    </span>
                </div>

                <h1 className="text-6xl md:text-8xl font-black leading-[0.9] tracking-tighter uppercase mb-8">
                    How It <span className="text-primary">Works</span>
                </h1>

                <p className="text-xl text-gray-400 max-w-3xl leading-relaxed">
                    HyperLink is a peer-to-peer file transfer application that uses{" "}
                    <span className="text-white font-bold">WebRTC</span> to create direct,
                    encrypted connections between browsers—no servers in between.
                </p>
            </div>

            {/* How It Works - Step by Step */}
            <div className="max-w-5xl mx-auto px-6 py-16 border-t border-[#333]">
                <h2 className="text-4xl font-black uppercase tracking-tight mb-12">
                    The Transfer <span className="text-bauhaus-blue">Process</span>
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Step 1 */}
                    <div className="flex gap-6 group">
                        <div className="flex-shrink-0 w-16 h-16 rounded-full bg-bauhaus-blue/20 border-2 border-bauhaus-blue flex items-center justify-center font-black text-2xl text-bauhaus-blue">
                            01
                        </div>
                        <div className="flex flex-col gap-2">
                            <h3 className="text-xl font-bold uppercase">Connection Setup</h3>
                            <p className="text-gray-400 leading-relaxed">
                                Both sender and receiver connect to a signaling server using PeerJS.
                                This server only facilitates the initial handshake—it never touches your files.
                            </p>
                        </div>
                    </div>

                    {/* Step 2 */}
                    <div className="flex gap-6 group">
                        <div className="flex-shrink-0 w-16 h-16 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center font-black text-2xl text-primary">
                            02
                        </div>
                        <div className="flex flex-col gap-2">
                            <h3 className="text-xl font-bold uppercase">Peer Discovery</h3>
                            <p className="text-gray-400 leading-relaxed">
                                Sender enters receiver&apos;s Peer ID (or scans QR code). The signaling server
                                exchanges ICE candidates to establish a direct P2P connection.
                            </p>
                        </div>
                    </div>

                    {/* Step 3 */}
                    <div className="flex gap-6 group">
                        <div className="flex-shrink-0 w-16 h-16 rounded-full bg-bauhaus-red/20 border-2 border-bauhaus-red flex items-center justify-center font-black text-2xl text-bauhaus-red">
                            03
                        </div>
                        <div className="flex flex-col gap-2">
                            <h3 className="text-xl font-bold uppercase">Direct Transfer</h3>
                            <p className="text-gray-400 leading-relaxed">
                                Once connected, files are split into chunks and sent directly browser-to-browser
                                via WebRTC data channels. Maximum speed, zero server storage.
                            </p>
                        </div>
                    </div>

                    {/* Step 4 */}
                    <div className="flex gap-6 group">
                        <div className="flex-shrink-0 w-16 h-16 rounded-full bg-green-500/20 border-2 border-green-500 flex items-center justify-center font-black text-2xl text-green-500">
                            04
                        </div>
                        <div className="flex flex-col gap-2">
                            <h3 className="text-xl font-bold uppercase">Completion</h3>
                            <p className="text-gray-400 leading-relaxed">
                                Receiver downloads the reassembled file. The connection closes and no trace
                                of your data remains on any server.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Technology Stack */}
            <div className="max-w-5xl mx-auto px-6 py-16 border-t border-[#333]">
                <h2 className="text-4xl font-black uppercase tracking-tight mb-12">
                    Technology <span className="text-bauhaus-blue">Stack</span>
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="bg-[#1a1a1a] border border-[#333] p-6">
                        <div className="w-12 h-12 rounded bg-bauhaus-blue flex items-center justify-center mb-4">
                            <span className="material-symbols-outlined text-2xl text-white">hub</span>
                        </div>
                        <h3 className="text-xl font-bold uppercase mb-3">WebRTC</h3>
                        <p className="text-gray-400 text-sm leading-relaxed">
                            Real-Time Communication protocol enabling direct browser-to-browser data transfer
                            with built-in NAT traversal using STUN/TURN servers.
                        </p>
                    </div>

                    <div className="bg-[#1a1a1a] border border-[#333] p-6">
                        <div className="w-12 h-12 rounded bg-primary flex items-center justify-center mb-4">
                            <span className="material-symbols-outlined text-2xl text-black">encrypted</span>
                        </div>
                        <h3 className="text-xl font-bold uppercase mb-3">DTLS/SRTP</h3>
                        <p className="text-gray-400 text-sm leading-relaxed">
                            Military-grade encryption protocols (DTLS 1.2, SRTP) are enforced by WebRTC,
                            ensuring all data is encrypted end-to-end during transit.
                        </p>
                    </div>

                    <div className="bg-[#1a1a1a] border border-[#333] p-6">
                        <div className="w-12 h-12 rounded bg-bauhaus-red flex items-center justify-center mb-4">
                            <span className="material-symbols-outlined text-2xl text-white">memory</span>
                        </div>
                        <h3 className="text-xl font-bold uppercase mb-3">Next.js + Supabase</h3>
                        <p className="text-gray-400 text-sm leading-relaxed">
                            React framework for the frontend, Supabase for auth and transfer metadata
                            (not file content). Fully serverless architecture.
                        </p>
                    </div>
                </div>
            </div>

            {/* Security & Privacy */}
            <div className="max-w-5xl mx-auto px-6 py-16 border-t border-[#333]">
                <h2 className="text-4xl font-black uppercase tracking-tight mb-12">
                    Security & <span className="text-bauhaus-red">Privacy</span>
                </h2>

                <div className="space-y-6">
                    <div className="flex gap-4 items-start">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                            <span className="material-symbols-outlined text-lg text-green-500">check</span>
                        </div>
                        <div>
                            <h3 className="text-lg font-bold mb-1">End-to-End Encryption</h3>
                            <p className="text-gray-400">
                                All transfers are encrypted using DTLS 1.2. Keys are negotiated directly between
                                your browser and the recipient&apos;s—not even our signaling server can access them.
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-4 items-start">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                            <span className="material-symbols-outlined text-lg text-green-500">check</span>
                        </div>
                        <div>
                            <h3 className="text-lg font-bold mb-1">Zero Server Storage</h3>
                            <p className="text-gray-400">
                                Your files never touch our servers. The signaling server only coordinates the
                                initial handshake. After that, data flows directly between peers.
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-4 items-start">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                            <span className="material-symbols-outlined text-lg text-green-500">check</span>
                        </div>
                        <div>
                            <h3 className="text-lg font-bold mb-1">Open Source</h3>
                            <p className="text-gray-400">
                                Our codebase is transparent. You can inspect, audit, and verify our security
                                claims yourself. Trust through transparency.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* FAQ */}
            <div className="max-w-5xl mx-auto px-6 py-16 border-t border-[#333]">
                <h2 className="text-4xl font-black uppercase tracking-tight mb-12">
                    Frequently Asked <span className="text-primary">Questions</span>
                </h2>

                <div className="space-y-8">
                    <div>
                        <h3 className="text-xl font-bold mb-2">Is there a file size limit?</h3>
                        <p className="text-gray-400">
                            Technically, no. However, very large files (10GB+) may encounter browser memory
                            limitations. For best results, we recommend files under 5GB.
                        </p>
                    </div>

                    <div>
                        <h3 className="text-xl font-bold mb-2">What if the connection drops?</h3>
                        <p className="text-gray-400">
                            Currently, you&apos;ll need to restart the transfer. We&apos;re working on resume functionality
                            that will allow transfers to pick up where they left off.
                        </p>
                    </div>

                    <div>
                        <h3 className="text-xl font-bold mb-2">Which browsers are supported?</h3>
                        <p className="text-gray-400">
                            Chrome, Edge, Firefox, Safari, and Opera all support WebRTC. For best performance,
                            use the latest version of Chrome or Edge.
                        </p>
                    </div>

                    <div>
                        <h3 className="text-xl font-bold mb-2">Why can&apos;t I connect to my peer?</h3>
                        <p className="text-gray-400">
                            Connection issues are usually caused by restrictive firewalls or NAT configurations.
                            Try using a different network, or check if your firewall is blocking WebRTC connections.
                        </p>
                    </div>
                </div>
            </div>

            {/* CTA */}
            <div className="max-w-5xl mx-auto px-6 py-16 border-t border-[#333]">
                <div className="bg-gradient-to-br from-bauhaus-blue/20 to-bauhaus-red/20 border-2 border-primary/30 p-12 text-center">
                    <h2 className="text-4xl font-black uppercase tracking-tight mb-4">
                        Ready to Transfer?
                    </h2>
                    <p className="text-gray-400 mb-8 max-w-2xl mx-auto">
                        Experience secure, fast, peer-to-peer file sharing. No registration required.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link href="/send">
                            <button className="h-14 px-8 bg-bauhaus-blue hover:bg-blue-600 text-white font-bold uppercase tracking-wider transition-colors">
                                Send a File
                            </button>
                        </Link>
                        <Link href="/receive">
                            <button className="h-14 px-8 bg-bauhaus-red hover:bg-red-600 text-white font-bold uppercase tracking-wider transition-colors">
                                Receive a File
                            </button>
                        </Link>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <footer className="mt-auto border-t border-[#333]">
                <div className="flex h-3 w-full">
                    <div className="flex-1 bg-bauhaus-blue" />
                    <div className="flex-1 bg-bauhaus-red" />
                    <div className="flex-1 bg-primary" />
                </div>
                <div className="bg-[#0f0f0f] py-8 px-8">
                    <div className="max-w-5xl mx-auto flex justify-between items-center">
                        <div className="flex items-center gap-1">
                            <span className="font-black text-xl tracking-tighter uppercase text-white">HYPER</span>
                            <span className="font-black text-xl tracking-tighter uppercase text-gray-500">LINK</span>
                        </div>
                        <Link href="/" className="text-gray-500 hover:text-white text-sm uppercase tracking-wider transition-colors">
                            Back to Home
                        </Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}
