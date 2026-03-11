import type { Metadata, Viewport } from "next";
import { Space_Grotesk } from "next/font/google";
import "./globals.css";
import BackgroundGrid from "@/components/background-grid";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-space-grotesk",
});

export const metadata: Metadata = {
  title: "HyperLink - P2P File Transfer",
  description: "Direct peer-to-peer file transfer. Pure speed.",
  icons: {
    icon: [
      { url: "/favicon/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon/favicon.ico", sizes: "any" },
    ],
    apple: "/favicon/apple-touch-icon.png",
  },
  manifest: "/favicon/site.webmanifest",
  openGraph: {
    title: "HyperLink - P2P File Transfer",
    description: "Direct peer-to-peer file transfer. Pure speed. No storage limits.",
    url: "https://hyperlink.vercel.app",
    siteName: "HyperLink",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "HyperLink - P2P File Transfer",
    description: "Direct peer-to-peer file transfer. Pure speed. No storage limits.",
  },
  appleWebApp: {
    capable: true,
    title: "HyperLink",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#050511", // Deep surface color from tailwind config
};

import { ClipboardListener } from "@/components/clipboard-listener";
import { Toaster } from "sonner";
import { GlobalFooter } from "@/components/global-footer";
import { KeyboardShortcutsProvider } from "@/components/keyboard-shortcuts-provider";

import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { SwUpdateWatcher } from "@/components/sw-update-watcher";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${spaceGrotesk.className} font-display selection:bg-primary selection:text-black bg-surface-deep min-h-screen flex flex-col`}
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[200] focus:bg-primary focus:text-black focus:px-4 focus:py-2 focus:font-bold focus:uppercase focus:tracking-wider focus:text-sm"
        >
          Skip to main content
        </a>
        <div id="main-content" className="relative z-10 flex-1 flex flex-col">
          {children}
        </div>
        {process.env.NODE_ENV !== "production" && (
          <script
            dangerouslySetInnerHTML={{
              __html: `
                (function() {
                  if (typeof window !== 'undefined') {
                    // Silence dev logs per user preference for a clean console
                    // We only wrap them to avoid breaking early-access internals
                    const noop = () => {};
                    window.console.log = noop;
                    window.console.info = noop;
                  }
                })();
              `,
            }}
          />
        )}
        <BackgroundGrid />
        <ClipboardListener />
        <KeyboardShortcutsProvider />
        {process.env.NODE_ENV === "production" && (
          <>
            <Analytics />
            <SpeedInsights />
          </>
        )}
        <Toaster />
        <GlobalFooter />
        <SwUpdateWatcher />
      </body>
    </html>
  );
}
