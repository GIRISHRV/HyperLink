"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser, signOut } from "@/lib/services/auth-service";
import { getUserProfile, updateUserProfile } from "@/lib/services/profile-service";
import type { User } from "@supabase/supabase-js";
import { Ripple } from "@/components/ripple";
import Link from "next/link";

const AVATAR_ICONS = [
  "person",
  "account_circle",
  "face",
  "sentiment_satisfied",
  "mood",
  "emoji_events",
  "star",
  "stars",
  "psychology",
  "rocket_launch",
  "bolt",
  "flash_on",
  "diamond",
  "workspace_premium",
  "verified",
  "shield",
];

const AVATAR_COLORS = [
  { name: "Primary Yellow", value: "bg-primary", text: "text-black" },
  { name: "Bauhaus Blue", value: "bg-bauhaus-blue", text: "text-white" },
  { name: "Bauhaus Red", value: "bg-bauhaus-red", text: "text-white" },
  { name: "Green", value: "bg-green-500", text: "text-white" },
  { name: "Purple", value: "bg-purple-500", text: "text-white" },
  { name: "Orange", value: "bg-orange-500", text: "text-black" },
];

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Profile settings
  const [selectedIcon, setSelectedIcon] = useState("person");
  const [selectedColor, setSelectedColor] = useState(AVATAR_COLORS[0]);
  const [displayName, setDisplayName] = useState("");

  // UI state
  const [saved, setSaved] = useState(false);

  const checkUserAndLoadProfile = useCallback(async () => {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      router.push("/auth");
      return;
    }
    setUser(currentUser);

    // Load profile from database
    const profile = await getUserProfile();
    if (profile) {
      setSelectedIcon(profile.avatar_icon || "person");
      setDisplayName(profile.display_name || "");

      const color = AVATAR_COLORS.find((c) => c.value === profile.avatar_color);
      if (color) setSelectedColor(color);
    }

    setLoading(false);
  }, [router]);

  useEffect(() => {
    checkUserAndLoadProfile();
  }, [checkUserAndLoadProfile]);

  async function handleSave() {
    setSaving(true);
    try {
      await updateUserProfile({
        display_name: displayName,
        avatar_icon: selectedIcon,
        avatar_color: selectedColor.value,
      });

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error("Failed to save profile:", error);
      alert("Failed to save settings. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    await signOut();
    router.push("/");
  }

  if (loading) {
    return (
      <div className="min-h-screen p-6 md:p-8 lg:p-12 animate-reveal relative overflow-hidden">
        {/* Skeleton Background Graph */}
        <div className="fixed inset-0 z-0 pointer-events-none">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] opacity-20"></div>
        </div>

        <div className="max-w-[1600px] mx-auto relative z-10">
          {/* Header Skeleton */}
          <div className="flex items-center justify-between mb-8 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="size-8 bg-white/10 backdrop-blur-sm rounded-sm" />
              <div className="h-6 bg-white/10 backdrop-blur-sm rounded w-32" />
            </div>
            <div className="flex items-center gap-3">
              <div className="size-10 bg-white/10 backdrop-blur-sm rounded-sm" />
              <div className="size-10 bg-white/10 backdrop-blur-sm rounded-full" />
            </div>
          </div>

          {/* Page Header Skeleton */}
          <div className="mb-12 animate-pulse">
            <div className="h-3 bg-white/10 backdrop-blur-sm rounded w-32 mb-4" />
            <div className="h-16 bg-white/10 backdrop-blur-sm rounded w-96 mb-4" />
            <div className="h-4 bg-white/10 backdrop-blur-sm rounded w-full max-w-2xl" />
          </div>

          {/* Settings Content Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-pulse">
            <div className="lg:col-span-4">
              <div className="bg-white/5 backdrop-blur-md p-8 rounded-sm border border-white/10 border-l-4 border-l-primary h-96 mask-container" />
            </div>
            <div className="lg:col-span-8 space-y-6">
              <div className="bg-white/5 backdrop-blur-md border border-white/10 border-l-4 border-l-bauhaus-blue p-8 rounded-r-sm h-64" />
              <div className="bg-white/5 backdrop-blur-md border border-white/10 border-l-4 border-l-primary p-8 rounded-r-sm h-48" />
              <div className="bg-white/5 backdrop-blur-md border border-white/10 border-l-4 border-l-bauhaus-red p-8 rounded-r-sm h-32" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col font-display bg-transparent relative overflow-x-hidden selection:bg-primary selection:text-black animate-reveal">
      {/* Background Grid */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] opacity-20"></div>
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-bauhaus-blue/5 rounded-full blur-[100px] animate-pulse delay-1000"></div>
      </div>


      {/* Navigation */}
      <header className="relative z-20 flex items-center justify-between px-6 py-5 border-b border-white/10 bg-[#1a1a1a]/80 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="size-8 bg-primary flex items-center justify-center rounded-sm text-black">
            <span className="material-symbols-outlined text-[24px]">link</span>
          </div>
          <h1 className="font-black text-xl tracking-wider text-white uppercase">HyperLink</h1>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/dashboard">
            <button className="flex items-center justify-center size-10 rounded-sm bg-[#242424] hover:bg-[#2f2f2f] transition-all active:scale-95 text-white border border-white/5">
              <span className="material-symbols-outlined">dashboard</span>
            </button>
          </Link>
          <div
            className={`size-10 rounded-full ${selectedColor.value} flex items-center justify-center border border-white/10 shadow-lg`}
          >
            <span className={`material-symbols-outlined text-xl ${selectedColor.text}`}>
              {selectedIcon}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 w-full max-w-[1600px] mx-auto p-6 md:p-8 lg:p-12">
        {/* Page Header */}
        <div className="mb-12">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-1 w-12 bg-bauhaus-red"></div>
            <span className="text-xs font-bold uppercase tracking-widest text-gray-500">Configuration</span>
          </div>
          <h1 className="text-6xl md:text-8xl font-black leading-[0.9] tracking-tighter uppercase mb-4 text-white">
            Settings<span className="text-bauhaus-blue">.</span>
          </h1>
          <p className="text-lg md:text-xl font-medium text-gray-400 max-w-2xl leading-relaxed">
            Customize your profile and manage your HyperLink account.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Preview */}
          <div className="lg:col-span-4">
            <div className="bg-[#1a1a1a]/60 backdrop-blur-xl p-8 rounded-sm border-l-4 border-primary border-y border-r border-white/5 sticky top-24 shadow-2xl">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6">Live Preview</h3>
              <div className="flex flex-col items-center gap-6">
                <div
                  className={`size-32 ${selectedColor.value} rounded-full flex items-center justify-center border-4 border-white/10 shadow-lg`}
                >
                  <span className={`material-symbols-outlined text-6xl ${selectedColor.text}`}>
                    {selectedIcon}
                  </span>
                </div>
                <div className="text-center">
                  <p className="font-black text-2xl uppercase tracking-tight text-white">
                    {displayName || user?.email?.split("@")[0] || "User"}
                  </p>
                  <p className="text-sm text-gray-400 mt-2 font-mono">{user?.email}</p>
                </div>
                <div className="w-full h-1 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
                <div className="grid grid-cols-3 gap-3 w-full">
                  <div className="bg-bauhaus-blue/20 p-3 rounded-sm text-center">
                    <span className="material-symbols-outlined text-bauhaus-blue text-2xl">upload</span>
                  </div>
                  <div className="bg-bauhaus-red/20 p-3 rounded-sm text-center">
                    <span className="material-symbols-outlined text-bauhaus-red text-2xl">download</span>
                  </div>
                  <div className="bg-primary/20 p-3 rounded-sm text-center">
                    <span className="material-symbols-outlined text-primary text-2xl">link</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Settings Forms */}
          <div className="lg:col-span-8 space-y-6">
            {/* Profile Section */}
            <section className="bg-[#1a1a1a]/60 backdrop-blur-xl border-l-4 border-bauhaus-blue border-y border-r border-white/5 p-8 rounded-r-sm shadow-xl">
              <h2 className="text-3xl font-black uppercase mb-6 tracking-tight flex items-center gap-3 text-white">
                <span className="material-symbols-outlined text-bauhaus-blue text-3xl">person</span>
                Profile
              </h2>

              <div className="space-y-6">
                {/* Display Name */}
                <div>
                  <label className="block text-xs uppercase tracking-widest text-gray-400 mb-2 font-bold">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder={user?.email?.split("@")[0] || "Enter your name"}
                    className="w-full bg-white/10 backdrop-blur-sm/40 border-2 border-white/10 focus:border-primary text-white px-4 py-3 focus:outline-none transition-colors rounded-sm"
                  />
                </div>

                {/* Email (read-only) */}
                <div>
                  <label className="block text-xs uppercase tracking-widest text-gray-400 mb-2 font-bold">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={user?.email || ""}
                    disabled
                    className="w-full bg-white/10 backdrop-blur-sm/20 border-2 border-white/5 text-gray-500 px-4 py-3 cursor-not-allowed rounded-sm"
                  />
                  <p className="text-xs text-gray-600 mt-2">Email cannot be changed from settings</p>
                </div>
              </div>
            </section>

            {/* Avatar Icon Section */}
            <section className="bg-[#1a1a1a]/60 backdrop-blur-xl border-l-4 border-primary border-y border-r border-white/5 p-8 rounded-r-sm shadow-xl">
              <h2 className="text-3xl font-black uppercase mb-6 tracking-tight flex items-center gap-3 text-white">
                <span className="material-symbols-outlined text-primary text-3xl">emoji_emotions</span>
                Avatar Icon
              </h2>
              <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
                {AVATAR_ICONS.map((icon) => (
                  <button
                    key={icon}
                    onClick={() => setSelectedIcon(icon)}
                    className={`size-16 flex items-center justify-center border-2 transition-all hover:scale-110 active:scale-95 rounded-sm text-white relative overflow-hidden ${selectedIcon === icon
                      ? "border-primary bg-primary/20"
                      : "border-white/10 hover:border-white/30 bg-white/10 backdrop-blur-sm/20"
                      }`}
                  >
                    <span className="material-symbols-outlined text-3xl relative z-10">{icon}</span>
                    <Ripple color={selectedIcon === icon ? "rgba(255,217,0,0.3)" : "rgba(255,255,255,0.2)"} />
                  </button>
                ))}
              </div>
            </section>

            {/* Avatar Color Section */}
            <section className="bg-[#1a1a1a]/60 backdrop-blur-xl border-l-4 border-bauhaus-red border-y border-r border-white/5 p-8 rounded-r-sm shadow-xl">
              <h2 className="text-3xl font-black uppercase mb-6 tracking-tight flex items-center gap-3 text-white">
                <span className="material-symbols-outlined text-bauhaus-red text-3xl">palette</span>
                Avatar Color
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {AVATAR_COLORS.map((color) => (
                  <button
                    key={color.value}
                    onClick={() => setSelectedColor(color)}
                    className={`flex items-center gap-3 p-4 border-2 transition-all hover:scale-105 active:scale-[0.98] rounded-sm relative overflow-hidden ${selectedColor.value === color.value
                      ? "border-white bg-white/5"
                      : "border-white/10 hover:border-white/30"
                      }`}
                  >
                    <div
                      className={`size-10 ${color.value} rounded-full border-2 border-white/20 shadow-lg relative z-10`}
                    ></div>
                    <span className="text-sm font-bold uppercase tracking-wide text-white relative z-10">{color.name}</span>
                    <Ripple />
                  </button>
                ))}
              </div>
            </section>

            {/* Account Actions */}
            <section className="bg-[#1a1a1a]/60 backdrop-blur-xl border-l-4 border-white border-y border-r border-white/5 p-8 rounded-r-sm shadow-xl">
              <h2 className="text-3xl font-black uppercase mb-6 tracking-tight flex items-center gap-3 text-white">
                <span className="material-symbols-outlined text-white text-3xl">admin_panel_settings</span>
                Account
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Link
                  href="/status"
                  className="bg-white/10 backdrop-blur-sm/50 hover:bg-white/10 backdrop-blur-sm border-2 border-gray-700 hover:border-primary text-white font-bold py-4 px-6 transition-all active:scale-[0.98] flex items-center justify-center gap-3 uppercase tracking-wider text-sm rounded-sm"
                >
                  <span className="material-symbols-outlined">radar</span>
                  Network Status
                </Link>
                <button
                  onClick={handleSignOut}
                  className="bg-red-900/30 hover:bg-red-900/50 border-2 border-red-900/50 hover:border-red-500 text-red-400 font-bold py-4 px-6 transition-all active:scale-[0.98] flex items-center justify-center gap-3 uppercase tracking-wider text-sm rounded-sm relative overflow-hidden"
                >
                  <span className="material-symbols-outlined relative z-10">logout</span>
                  <span className="relative z-10">Sign Out</span>
                  <Ripple color="rgba(239, 68, 68, 0.3)" />
                </button>
              </div>
            </section>

            {/* Save Button */}
            <div className="flex justify-end">
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-primary hover:bg-yellow-400 text-black font-bold py-4 px-12 uppercase tracking-wider transition-all active:scale-95 flex items-center gap-3 disabled:opacity-50 rounded-sm text-sm shadow-lg relative overflow-hidden"
              >
                <span className="material-symbols-outlined text-xl relative z-10">save</span>
                <span className="relative z-10">{saving ? "Saving..." : saved ? "Saved!" : "Save Changes"}</span>
                <Ripple color="rgba(0,0,0,0.2)" />
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer: Tri-Color Strip */}
      <footer className="mt-auto relative z-20">
        <div className="flex h-2 w-full">
          <div className="flex-1 bg-bauhaus-blue"></div>
          <div className="flex-1 bg-bauhaus-red"></div>
          <div className="flex-1 bg-primary"></div>
        </div>
      </footer>
    </div>
  );
}




