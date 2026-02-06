"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getUserProfile } from "@/lib/services/profile-service";

interface SimpleHeaderProps {
  userEmail?: string;
}

export default function SimpleHeader({ userEmail }: SimpleHeaderProps) {
  const [displayName, setDisplayName] = useState<string>("");

  useEffect(() => {
    async function loadProfile() {
      try {
        const profile = await getUserProfile();
        if (profile?.display_name) {
          setDisplayName(profile.display_name);
        }
      } catch (e) {
        console.error("Failed to load profile for header", e);
      }
    }
    loadProfile();
  }, []);

  return (
    <header className="relative z-20 flex items-center justify-between px-6 py-4 lg:px-12 border-b border-gray-800 bg-background-dark/80 backdrop-blur-md">
      {/* Logo */}
      <Link href="/dashboard" className="flex items-center gap-3">
        <div className="flex items-center justify-center size-8 bg-white text-black rounded-full">
          <span className="material-symbols-outlined text-xl">bolt</span>
        </div>
        <h1 className="text-xl font-bold tracking-tight uppercase">HyperLink</h1>
      </Link>

      {/* Right Side - Settings */}
      <div className="flex items-center gap-4">
        <div className="hidden sm:flex flex-col items-end mr-2">
          <span className="text-sm font-bold text-white leading-none">
            {displayName || userEmail?.split("@")[0] || "User"}
          </span>
        </div>
        <Link
          href="/settings"
          className="size-10 bg-gray-700 rounded-full border-2 border-primary/20 hover:border-primary overflow-hidden relative flex items-center justify-center text-white hover:bg-gray-600 transition-colors"
        >
          <span className="material-symbols-outlined">settings</span>
        </Link>
      </div>
    </header>
  );
}
