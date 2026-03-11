"use client";

import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col font-display bg-transparent relative overflow-x-hidden selection:bg-primary selection:text-black">
      <main className="relative z-10 flex-1 w-full max-w-4xl mx-auto p-6 md:p-8 lg:p-12">
        {/* Page Header */}
        <div className="mb-12">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-1 w-12 bg-primary"></div>
            <span className="text-xs font-bold uppercase tracking-widest text-gray-500">Legal</span>
          </div>
          <h1 className="text-6xl md:text-8xl font-black leading-[0.9] tracking-tighter uppercase mb-4 text-white">
            Privacy<span className="text-primary">.</span>
          </h1>
          <p className="text-lg font-medium text-gray-400 max-w-2xl">Last updated: March 2026</p>
        </div>

        <div className="space-y-8 text-gray-300">
          <section className="bg-white/5 backdrop-blur-xl border-l-4 border-primary border-y border-r border-white/5 p-6">
            <h2 className="text-xl font-black uppercase tracking-tight text-white mb-3">
              Overview
            </h2>
            <p className="leading-relaxed">
              HyperLink is a <strong className="text-white">peer-to-peer file transfer</strong>{" "}
              application. Files you transfer are sent{" "}
              <strong className="text-white">directly between browsers</strong> using WebRTC — they
              never touch our servers. We store only the minimal metadata required to operate the
              service.
            </p>
          </section>

          <section className="bg-white/5 backdrop-blur-xl border-l-4 border-bauhaus-blue border-y border-r border-white/5 p-6">
            <h2 className="text-xl font-black uppercase tracking-tight text-white mb-3">
              Data We Collect
            </h2>
            <ul className="space-y-2 leading-relaxed">
              <li>
                <span className="text-primary font-bold">Account:</span> Email address used for
                authentication (via Supabase Auth).
              </li>
              <li>
                <span className="text-primary font-bold">Transfer metadata:</span> Filename, file
                size, sender/receiver, transfer status, and timestamps.
              </li>
              <li>
                <span className="text-primary font-bold">Profile:</span> Optional display name and
                avatar icon you set in Settings.
              </li>
              <li>
                <span className="text-bauhaus-red font-bold">File content:</span> We do NOT store
                file content. Files are transferred peer-to-peer and are never uploaded to our
                servers.
              </li>
            </ul>
          </section>

          <section className="bg-white/5 backdrop-blur-xl border-l-4 border-primary border-y border-r border-white/5 p-6">
            <h2 className="text-xl font-black uppercase tracking-tight text-white mb-3">
              How We Use Your Data
            </h2>
            <ul className="space-y-2 leading-relaxed">
              <li>Authenticate your account and protect access to your transfers.</li>
              <li>Display your transfer history in the app.</li>
              <li>
                Enable peer discovery via the signaling server (WebSocket connection, not content).
              </li>
              <li>Monitor application errors via Sentry (anonymized stack traces).</li>
            </ul>
          </section>

          <section className="bg-white/5 backdrop-blur-xl border-l-4 border-bauhaus-blue border-y border-r border-white/5 p-6">
            <h2 className="text-xl font-black uppercase tracking-tight text-white mb-3">
              Third-Party Services
            </h2>
            <ul className="space-y-2 leading-relaxed">
              <li>
                <span className="text-white font-bold">Supabase</span> — Authentication and transfer
                metadata storage. GDPR compliant, EU data residency available.
              </li>
              <li>
                <span className="text-white font-bold">Vercel</span> — Frontend hosting. Analytics
                (page views only, no PII).
              </li>
              <li>
                <span className="text-white font-bold">Railway</span> — Signaling server
                infrastructure.
              </li>
              <li>
                <span className="text-white font-bold">Sentry</span> — Error monitoring (stack
                traces, no file content).
              </li>
              <li>
                <span className="text-white font-bold">OpenRelay / Metered.ca</span> — TURN server
                fallback for peer connections (connection metadata only, no file content).
              </li>
            </ul>
          </section>

          <section className="bg-white/5 backdrop-blur-xl border-l-4 border-bauhaus-red border-y border-r border-white/5 p-6">
            <h2 className="text-xl font-black uppercase tracking-tight text-white mb-3">
              Your Rights (GDPR)
            </h2>
            <p className="mb-3">Under GDPR you have the right to:</p>
            <ul className="space-y-2 leading-relaxed">
              <li>
                <span className="text-white font-bold">Access</span> — View your transfer history in
                the app.
              </li>
              <li>
                <span className="text-white font-bold">Delete</span> — Delete individual transfers
                from your history, or delete your entire account from Settings → Account → Delete
                Account.
              </li>
              <li>
                <span className="text-white font-bold">Portability</span> — Contact us to request a
                data export of your account information.
              </li>
              <li>
                <span className="text-white font-bold">Object</span> — Contact us to opt out of any
                non-essential data processing.
              </li>
            </ul>
          </section>

          <section className="bg-white/5 backdrop-blur-xl border-l-4 border-primary border-y border-r border-white/5 p-6">
            <h2 className="text-xl font-black uppercase tracking-tight text-white mb-3">
              Data Retention
            </h2>
            <p className="leading-relaxed">
              Transfer metadata is retained until you delete it or close your account. When you
              delete your account, all associated data (profile, transfer history) is permanently
              deleted within 24 hours.
            </p>
          </section>

          <section className="bg-white/5 backdrop-blur-xl border-l-4 border-bauhaus-blue border-y border-r border-white/5 p-6">
            <h2 className="text-xl font-black uppercase tracking-tight text-white mb-3">Contact</h2>
            <p className="leading-relaxed">
              For privacy questions, data requests, or to report a privacy concern, open an issue at{" "}
              <a
                href="https://github.com/GIRISHRV/HyperLink"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline hover:text-yellow-300 transition-colors"
              >
                github.com/GIRISHRV/HyperLink
              </a>
              .
            </p>
          </section>

          <div className="pt-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-gray-400 hover:text-white transition-colors"
            >
              <span className="material-symbols-outlined text-lg">arrow_back</span>
              Back to Home
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
