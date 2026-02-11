import type { Metadata } from "next";
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
      { url: "/favicon/favicon.ico", sizes: "any" }
    ],
    apple: "/favicon/apple-touch-icon.png",
  },
  manifest: "/favicon/site.webmanifest",
};

import { ClipboardListener } from "@/components/clipboard-listener";
import { Toaster } from "sonner";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${spaceGrotesk.className} font-display selection:bg-primary selection:text-black bg-[#0a0a0a] min-h-screen`}
      >
        <div className="relative z-10">{children}</div>
        <BackgroundGrid />
        <ClipboardListener />
        <Toaster />
      </body>
    </html>
  );
}

