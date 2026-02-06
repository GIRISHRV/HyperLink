"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser, signOut } from "@/lib/services/auth-service";
import { getUserProfile, updateUserProfile } from "@/lib/services/profile-service";
import type { User } from "@supabase/supabase-js";
import SimpleHeader from "@/components/simple-header";
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

  useEffect(() => {
    checkUserAndLoadProfile();
  }, []);

  async function checkUserAndLoadProfile() {
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
  }

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
      <div className="min-h-screen bg-background-dark flex items-center justify-center">
        <span className="material-symbols-outlined text-primary animate-spin text-4xl">
          progress_activity
        </span>
      </div>
    );
  }

  return (
    <div className="bg-background-dark font-display text-white min-h-screen flex flex-col">
      <SimpleHeader userEmail={user?.email} />

      <main className="flex-1 w-full max-w-5xl mx-auto p-6 md:p-8 lg:p-12 flex flex-col gap-8">
        {/* Header */}
        <header className="pb-6 border-b-4 border-[#4b4520]">
          <div className="w-12 h-1 bg-primary mb-4"></div>
          <h1 className="text-5xl md:text-6xl font-black text-white leading-[0.85] tracking-tighter uppercase mb-4">
            Settings
          </h1>
          <p className="text-gray-400 text-lg">Customize your HyperLink experience.</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Preview */}
          <div className="lg:col-span-1">
            <div className="bg-[#2a2614] border border-[#4b4520] p-8 sticky top-24">
              <h3 className="text-sm uppercase tracking-widest text-gray-400 mb-4">Preview</h3>
              <div className="flex flex-col items-center gap-4">
                <div
                  className={`size-24 ${selectedColor.value} rounded-full flex items-center justify-center border-4 border-white/10`}
                >
                  <span className={`material-symbols-outlined text-5xl ${selectedColor.text}`}>
                    {selectedIcon}
                  </span>
                </div>
                <div className="text-center">
                  <p className="font-bold text-lg">
                    {displayName || user?.email?.split("@")[0] || "User"}
                  </p>
                  <p className="text-xs text-gray-400">{user?.email}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Settings */}
          <div className="lg:col-span-2 space-y-6">
            {/* Profile Section */}
            <section className="bg-[#2a2614] border border-[#4b4520] p-6">
              <h2 className="text-2xl font-bold uppercase mb-6 flex items-center gap-2">
                <span className="size-2 bg-primary"></span>
                Profile
              </h2>

              {/* Display Name */}
              <div className="mb-6">
                <label className="block text-xs uppercase tracking-widest text-gray-400 mb-2">
                  Display Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder={user?.email?.split("@")[0] || "Enter your name"}
                  className="w-full bg-black/40 border-2 border-white/10 focus:border-primary text-white px-4 py-3 focus:outline-none transition-colors"
                />
              </div>

              {/* Email (read-only) */}
              <div className="mb-6">
                <label className="block text-xs uppercase tracking-widest text-gray-400 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={user?.email || ""}
                  disabled
                  className="w-full bg-black/20 border-2 border-white/5 text-gray-500 px-4 py-3 cursor-not-allowed"
                />
                <p className="text-xs text-gray-600 mt-1">Email cannot be changed from settings</p>
              </div>
            </section>

            {/* Avatar Icon Section */}
            <section className="bg-[#2a2614] border border-[#4b4520] p-6">
              <h2 className="text-2xl font-bold uppercase mb-6 flex items-center gap-2">
                <span className="size-2 bg-primary"></span>
                Avatar Icon
              </h2>
              <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
                {AVATAR_ICONS.map((icon) => (
                  <button
                    key={icon}
                    onClick={() => setSelectedIcon(icon)}
                    className={`size-14 flex items-center justify-center border-2 transition-all hover:scale-110 ${
                      selectedIcon === icon
                        ? "border-primary bg-primary/20"
                        : "border-white/10 hover:border-white/30 bg-black/20"
                    }`}
                  >
                    <span className="material-symbols-outlined text-2xl">{icon}</span>
                  </button>
                ))}
              </div>
            </section>

            {/* Avatar Color Section */}
            <section className="bg-[#2a2614] border border-[#4b4520] p-6">
              <h2 className="text-2xl font-bold uppercase mb-6 flex items-center gap-2">
                <span className="size-2 bg-primary"></span>
                Avatar Color
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {AVATAR_COLORS.map((color) => (
                  <button
                    key={color.value}
                    onClick={() => setSelectedColor(color)}
                    className={`flex items-center gap-3 p-4 border-2 transition-all hover:scale-105 ${
                      selectedColor.value === color.value
                        ? "border-white bg-white/5"
                        : "border-white/10 hover:border-white/30"
                    }`}
                  >
                    <div
                      className={`size-8 ${color.value} rounded-full border-2 border-white/20`}
                    ></div>
                    <span className="text-sm font-medium">{color.name}</span>
                  </button>
                ))}
              </div>
            </section>

            {/* Account Actions */}
            <section className="bg-[#2a2614] border border-[#4b4520] p-6">
              <h2 className="text-2xl font-bold uppercase mb-6 flex items-center gap-2">
                <span className="size-2 bg-bauhaus-red"></span>
                Account
              </h2>
              <div className="space-y-4">
                <Link
                  href="/status"
                  className="w-full bg-gray-800/50 hover:bg-gray-800 border border-gray-700 hover:border-primary text-white font-bold py-3 px-6 transition-all flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined">radar</span>
                  Network Status
                </Link>
                <button
                  onClick={handleSignOut}
                  className="w-full bg-red-900/30 hover:bg-red-900/50 border border-red-900/50 hover:border-red-500 text-red-400 font-bold py-3 px-6 transition-all flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined">logout</span>
                  Sign Out
                </button>
              </div>
            </section>

            {/* Save Button */}
            <div className="flex justify-end gap-4">
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-primary hover:bg-white text-black font-bold py-3 px-8 uppercase tracking-wider transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <span className="material-symbols-outlined">save</span>
                {saving ? "Saving..." : saved ? "Saved!" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <div className="mt-auto w-full h-2 flex">
        <div className="w-1/3 bg-bauhaus-blue"></div>
        <div className="w-1/3 bg-bauhaus-red"></div>
        <div className="w-1/3 bg-primary"></div>
      </div>
    </div>
  );
}
