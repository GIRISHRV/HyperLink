"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "@/lib/services/auth-service";
import { useRequireAuth } from "@/lib/hooks/use-require-auth";
import {
  getUserProfile,
  updateUserProfile,
  type UpdateProfileData,
} from "@/lib/services/profile-service";
import { Ripple } from "@/components/ripple";
import Link from "next/link";
import AppHeader from "@/components/app-header";
import { toast } from "sonner";
import { logger } from "@repo/utils";
import { useAdminStatus } from "@/lib/hooks/use-admin-status";

// Admin Section Component
function AdminSection({ userId }: { userId: string }) {
  const { isAdmin, loading } = useAdminStatus(userId);

  if (loading) {
    return (
      <section className="rounded-xl bg-surface/60 backdrop-blur-xl border border-purple-500/30 p-6 animate-pulse">
        <div className="h-5 bg-white/10 rounded-full w-36 mb-4"></div>
        <div className="h-16 bg-white/5 rounded-lg"></div>
      </section>
    );
  }

  if (!isAdmin) {
    return null; // Don't show admin section for non-admin users
  }

  return (
    <section className="bg-surface/60 backdrop-blur-xl border-l-4 border-purple-500 border-y border-r border-white/5 p-6">
      <h2 className="text-xl font-black uppercase mb-4 tracking-tight flex items-center gap-2 text-white">
        <span className="material-symbols-outlined text-purple-400 text-xl">security</span>
        Administration
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Link
          href="/admin"
          className="bg-purple-900/20 hover:bg-purple-900/40 border border-purple-500/30 hover:border-purple-400 text-purple-300 font-bold py-2 px-3 transition-all text-xs uppercase tracking-wider flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-sm">dashboard</span>
          Admin Dashboard
        </Link>
        <Link
          href="/admin/incidents"
          className="bg-orange-900/20 hover:bg-orange-900/40 border border-orange-500/30 hover:border-orange-400 text-orange-300 font-bold py-2 px-3 transition-all text-xs uppercase tracking-wider flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-sm">report_problem</span>
          Manage Incidents
        </Link>
      </div>
      <div className="mt-3 p-2 bg-purple-900/10 border border-purple-500/20 rounded-none">
        <p className="text-xs text-purple-300 flex items-center gap-2">
          <span className="material-symbols-outlined text-sm">admin_panel_settings</span>
          You have administrator privileges
        </p>
      </div>
    </section>
  );
}

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
  const { user, loading } = useRequireAuth();
  const [saving, setSaving] = useState(false);

  // Profile settings
  const [selectedIcon, setSelectedIcon] = useState("person");
  const [selectedColor, setSelectedColor] = useState(AVATAR_COLORS[0]);
  const [displayName, setDisplayName] = useState("");
  const [compatibilityMode, setCompatibilityMode] = useState(false); // Task #4: Forced Relay

  // Notification preferences
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [browserNotificationsEnabled, setBrowserNotificationsEnabled] = useState(true);

  // UI state
  const [saved, setSaved] = useState(false);

  // GDPR: Account deletion state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const loadProfile = useCallback(async () => {
    // Load profile from database
    if (!user) return;
    const profile = await getUserProfile(user.id);
    if (profile) {
      setSelectedIcon(profile.avatar_icon || "person");
      setDisplayName(profile.display_name || "");

      const color = AVATAR_COLORS.find((c) => c.value === profile.avatar_color);
      if (color) setSelectedColor(color);
    }

    // Task #4: Load compatibility mode from local storage
    const stored = localStorage.getItem("hl_compatibility_mode");
    setCompatibilityMode(stored === "true");

    // Load notification preferences
    const soundPref = localStorage.getItem("hl_sound_enabled");
    setSoundEnabled(soundPref === null ? true : soundPref === "true");

    const notifPref = localStorage.getItem("hl_browser_notifications_enabled");
    setBrowserNotificationsEnabled(notifPref === null ? true : notifPref === "true");
  }, [user]);

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user, loadProfile]);

  async function handleSave() {
    if (!user) return;
    try {
      setSaving(true);

      const updates: UpdateProfileData = {
        display_name: displayName,
        avatar_color: selectedColor.value, // Changed from avatarColor to selectedColor.value
      };

      if (selectedIcon) {
        // Changed from avatarIcon to selectedIcon
        updates.avatar_icon = selectedIcon; // Changed from avatarIcon to selectedIcon
      }

      await updateUserProfile(user.id, updates);

      // Task #4: Save compatibility mode to localStorage
      localStorage.setItem("hl_compatibility_mode", compatibilityMode.toString());

      // Save notification preferences
      localStorage.setItem("hl_sound_enabled", soundEnabled.toString());
      localStorage.setItem(
        "hl_browser_notifications_enabled",
        browserNotificationsEnabled.toString()
      );

      // Artificial delay for UI feedback and E2E test reliability
      await new Promise((resolve) => setTimeout(resolve, 800));

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      logger.error({ error }, "Failed to save profile:");
      toast.error("Failed to save settings. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    try {
      await signOut();
    } catch (error) {
      logger.error({ error }, "Sign out failed");
    }
    router.push("/auth");
  }

  async function handleDeleteAccount() {
    if (deleteConfirmText !== "DELETE") return;
    try {
      setDeleting(true);
      const res = await fetch("/api/account/delete", { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Deletion failed");
      }
      // Account deleted — redirect to auth page
      toast.success("Your account has been permanently deleted.");
      router.push("/auth");
    } catch (error) {
      logger.error({ error }, "Failed to delete account");
      toast.error(
        error instanceof Error ? error.message : "Failed to delete account. Please try again."
      );
      setDeleting(false);
      setShowDeleteModal(false);
      setDeleteConfirmText("");
    }
  }

  return (
    <div className="min-h-screen flex flex-col font-display bg-transparent relative overflow-x-hidden selection:bg-primary selection:text-black">
      {loading ? (
        <div className="p-6 md:p-8 lg:p-12 relative z-10">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header Skeleton */}
            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="size-8 bg-white/10 rounded-md" />
                <div className="h-6 bg-white/10 rounded-full w-32" />
              </div>
            </div>
            {/* Page Header Skeleton */}
            <div className="animate-pulse rounded-xl border border-white/10 bg-gradient-to-r from-white/[0.05] to-white/[0.02] p-6">
              <div className="h-3 bg-white/10 rounded-full w-32 mb-4" />
              <div className="h-12 bg-white/10 rounded-lg w-96 max-w-full mb-3" />
              <div className="h-4 bg-white/5 rounded-full w-[28rem] max-w-full" />
            </div>
            {/* Settings Content Skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-4">
                <div className="bg-white/[0.04] border border-white/10 rounded-xl h-96 animate-pulse" />
              </div>
              <div className="lg:col-span-8 space-y-6">
                <div className="bg-white/[0.04] border border-white/10 rounded-xl h-64 animate-pulse" />
                <div className="bg-white/[0.03] border border-white/10 rounded-xl h-40 animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col animate-reveal-simple relative z-10">
          {/* Navigation */}
          <AppHeader variant="app" />

          {/* Main Content */}
          <main className="relative z-10 flex-1 w-full max-w-6xl mx-auto p-6 md:p-8">
            {/* Compact Page Header */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-1 w-8 bg-bauhaus-red"></div>
                <span className="text-xs font-bold uppercase tracking-widest text-gray-500">
                  Configuration
                </span>
              </div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tighter uppercase mb-2 text-white">
                Settings<span className="text-bauhaus-blue">.</span>
              </h1>
              <p className="text-gray-400 max-w-xl">
                Customize your profile and manage your HyperLink account.
              </p>
            </div>

            {/* Single Column Layout - All Cards Stacked */}
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Preview Card */}
              <div className="bg-surface/60 backdrop-blur-xl p-6 border-l-4 border-primary border-y border-r border-white/5">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6">
                  Live Preview
                </h3>
                <div className="flex items-center gap-8">
                  <div
                    className={`size-32 ${selectedColor.value} rounded-full flex items-center justify-center border-2 border-white/10 shrink-0`}
                  >
                    <span className={`material-symbols-outlined text-5xl ${selectedColor.text}`}>
                      {selectedIcon}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-xl text-white">
                      {displayName || user?.email?.split("@")[0] || "User"}
                    </p>
                    <p className="text-sm text-gray-400 font-mono mt-1">{user?.email}</p>
                  </div>
                  <div className="flex gap-3">
                    <div className="bg-bauhaus-blue/20 p-3 text-center border border-bauhaus-blue/30">
                      <span className="material-symbols-outlined text-bauhaus-blue text-xl">
                        upload
                      </span>
                    </div>
                    <div className="bg-bauhaus-red/20 p-3 text-center border border-bauhaus-red/30">
                      <span className="material-symbols-outlined text-bauhaus-red text-xl">
                        download
                      </span>
                    </div>
                    <div className="bg-primary/20 p-3 text-center border border-primary/30">
                      <span className="material-symbols-outlined text-primary text-xl">link</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Profile & Appearance Card */}
              <section className="bg-surface/60 backdrop-blur-xl border-l-4 border-bauhaus-blue border-y border-r border-white/5 p-6">
                <h2 className="text-xl font-black uppercase mb-4 tracking-tight flex items-center gap-2 text-white">
                  <span className="material-symbols-outlined text-bauhaus-blue text-xl">
                    person
                  </span>
                  Profile & Appearance
                </h2>

                {/* Profile Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-xs uppercase tracking-widest text-gray-400 mb-2 font-bold">
                      Display Name
                    </label>
                    <input
                      id="settings-display-name"
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder={user?.email?.split("@")[0] || "Enter your name"}
                      className="w-full bg-white/10 border border-white/20 focus:border-primary text-white px-3 py-2 focus:outline-none transition-colors text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-widest text-gray-400 mb-2 font-bold">
                      Email Address
                    </label>
                    <input
                      id="settings-email"
                      type="email"
                      value={user?.email || ""}
                      disabled
                      className="w-full bg-white/5 border border-white/10 text-gray-500 px-3 py-2 cursor-not-allowed text-sm"
                    />
                  </div>
                </div>

                {/* Avatar Selection */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Avatar Icon */}
                  <div>
                    <h3 className="text-xs uppercase tracking-widest text-gray-400 mb-3 font-bold">
                      Avatar Icon
                    </h3>
                    <div className="grid grid-cols-6 gap-2">
                      {AVATAR_ICONS.slice(0, 12).map((icon) => (
                        <button
                          key={icon}
                          onClick={() => setSelectedIcon(icon)}
                          className={`size-10 flex items-center justify-center border transition-all hover:scale-110 active:scale-95 text-white relative overflow-hidden ${
                            selectedIcon === icon
                              ? "border-primary bg-primary/20"
                              : "border-white/10 hover:border-white/30 bg-white/5"
                          }`}
                        >
                          <span className="material-symbols-outlined text-lg relative z-10">
                            {icon}
                          </span>
                          <Ripple
                            color={
                              selectedIcon === icon
                                ? "rgba(255,217,0,0.3)"
                                : "rgba(255,255,255,0.2)"
                            }
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Avatar Color */}
                  <div>
                    <h3 className="text-xs uppercase tracking-widest text-gray-400 mb-3 font-bold">
                      Avatar Color
                    </h3>
                    <div className="grid grid-cols-1 gap-2">
                      {AVATAR_COLORS.map((color) => (
                        <button
                          key={color.value}
                          onClick={() => setSelectedColor(color)}
                          className={`flex items-center gap-2 p-2 border transition-all hover:scale-105 active:scale-[0.98] relative overflow-hidden ${
                            selectedColor.value === color.value
                              ? "border-white bg-white/5"
                              : "border-white/10 hover:border-white/30"
                          }`}
                        >
                          <div
                            className={`size-6 ${color.value} rounded-full border border-white/20 relative z-10`}
                          ></div>
                          <span className="text-xs font-bold uppercase tracking-wide text-white relative z-10">
                            {color.name}
                          </span>
                          <Ripple />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              {/* Preferences Card */}
              <section className="bg-surface/60 backdrop-blur-xl border-l-4 border-primary border-y border-r border-white/5 p-6">
                <h2 className="text-xl font-black uppercase mb-4 tracking-tight flex items-center gap-2 text-white">
                  <span className="material-symbols-outlined text-primary text-xl">tune</span>
                  Preferences
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Sound Effects */}
                  <div className="flex items-center justify-between p-3 bg-white/5 border border-white/10">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-lg">
                        volume_up
                      </span>
                      <div>
                        <h3 className="text-sm font-bold text-white">Sound Effects</h3>
                        <p className="text-xs text-gray-400">Audio chimes</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSoundEnabled(!soundEnabled)}
                      className={`relative inline-flex h-6 w-11 items-center transition-all focus:outline-none ${soundEnabled ? "bg-primary" : "bg-white/10"}`}
                    >
                      <span
                        className={`inline-block size-4 transform bg-white transition-transform ${soundEnabled ? "translate-x-6" : "translate-x-1"}`}
                      />
                    </button>
                  </div>

                  {/* Browser Notifications */}
                  <div className="flex items-center justify-between p-3 bg-white/5 border border-white/10">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-bauhaus-blue text-lg">
                        notifications
                      </span>
                      <div>
                        <h3 className="text-sm font-bold text-white">Notifications</h3>
                        <p className="text-xs text-gray-400">Desktop alerts</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setBrowserNotificationsEnabled(!browserNotificationsEnabled)}
                      className={`relative inline-flex h-6 w-11 items-center transition-all focus:outline-none ${browserNotificationsEnabled ? "bg-primary" : "bg-white/10"}`}
                    >
                      <span
                        className={`inline-block size-4 transform bg-white transition-transform ${browserNotificationsEnabled ? "translate-x-6" : "translate-x-1"}`}
                      />
                    </button>
                  </div>

                  {/* Compatibility Mode */}
                  <div className="flex items-center justify-between p-3 bg-white/5 border border-white/10 md:col-span-2">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-yellow-500 text-lg">
                        router
                      </span>
                      <div>
                        <h3 className="text-sm font-bold text-white">Compatibility Mode</h3>
                        <p className="text-xs text-gray-400">Force relay for strict firewalls</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setCompatibilityMode(!compatibilityMode)}
                      className={`relative inline-flex h-6 w-11 items-center transition-all focus:outline-none ${compatibilityMode ? "bg-primary" : "bg-white/10"}`}
                    >
                      <span
                        className={`inline-block size-4 transform bg-white transition-transform ${compatibilityMode ? "translate-x-6" : "translate-x-1"}`}
                      />
                    </button>
                  </div>
                </div>
              </section>

              {/* Account Actions Card */}
              <section className="bg-surface/60 backdrop-blur-xl border-l-4 border-bauhaus-red border-y border-r border-white/5 p-6">
                <h2 className="text-xl font-black uppercase mb-4 tracking-tight flex items-center gap-2 text-white">
                  <span className="material-symbols-outlined text-bauhaus-red text-xl">
                    admin_panel_settings
                  </span>
                  Account
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Link
                    href="/status"
                    className="bg-white/5 hover:bg-white/10 border border-white/20 hover:border-primary text-white font-bold py-2 px-3 transition-all text-xs uppercase tracking-wider text-center flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-sm">radar</span>
                    Network Status
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="bg-red-900/30 hover:bg-red-900/50 border border-red-900/50 hover:border-red-500 text-red-400 font-bold py-2 px-3 transition-all text-xs uppercase tracking-wider flex items-center justify-center gap-2 relative overflow-hidden"
                  >
                    <span className="material-symbols-outlined text-sm relative z-10">logout</span>
                    <span className="relative z-10">Sign Out</span>
                    <Ripple color="rgba(239, 68, 68, 0.3)" />
                  </button>
                </div>
              </section>

              {/* Admin Section - Only show for admin users */}
              {user && <AdminSection userId={user.id} />}

              {/* Danger Zone Card */}
              <section className="bg-surface/60 backdrop-blur-xl border-l-4 border-red-700 border-y border-r border-white/5 p-6">
                <h2 className="text-xl font-black uppercase mb-2 tracking-tight flex items-center gap-2 text-white">
                  <span className="material-symbols-outlined text-red-500 text-xl">
                    delete_forever
                  </span>
                  Danger Zone
                </h2>
                <p className="text-sm text-gray-400 mb-4">
                  Permanently delete your account and all data. This action{" "}
                  <strong className="text-white">cannot be undone</strong>.{" "}
                  <Link
                    href="/privacy"
                    className="text-primary underline hover:text-yellow-300 transition-colors"
                  >
                    Privacy Policy
                  </Link>
                </p>
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="bg-red-950/50 hover:bg-red-900/60 border border-red-800 hover:border-red-500 text-red-400 font-bold py-2 px-4 transition-all text-xs uppercase tracking-wider flex items-center gap-2 relative overflow-hidden"
                >
                  <span className="material-symbols-outlined text-sm relative z-10">
                    delete_forever
                  </span>
                  <span className="relative z-10">Delete My Account</span>
                </button>
              </section>

              {/* Save Button */}
              <div className="flex justify-end">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-primary hover:bg-yellow-400 text-black font-bold py-3 px-8 uppercase tracking-wider transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50 text-sm relative overflow-hidden"
                >
                  <span className="material-symbols-outlined text-lg relative z-10">save</span>
                  <span className="relative z-10">
                    {saving ? "Saving..." : saved ? "Saved!" : "Save Changes"}
                  </span>
                  <Ripple color="rgba(0,0,0,0.2)" />
                </button>
              </div>
            </div>
          </main>

          {/* GDPR: Delete Account Confirmation Modal */}
          {showDeleteModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
              <div className="w-full max-w-md bg-surface border border-red-900/50 shadow-2xl">
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="material-symbols-outlined text-red-500 text-3xl">warning</span>
                    <h2 className="text-xl font-black uppercase tracking-tight text-white">
                      Delete Account
                    </h2>
                  </div>
                  <p className="text-gray-300 text-sm mb-4 leading-relaxed">
                    This will <strong className="text-white">permanently delete</strong> your
                    account, profile, and all transfer history. This cannot be undone.
                  </p>
                  <p className="text-xs text-gray-400 mb-2 uppercase tracking-widest">
                    Type <strong className="text-red-400">DELETE</strong> to confirm
                  </p>
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder="DELETE"
                    className="w-full bg-red-950/30 border border-red-800 focus:border-red-500 text-white px-4 py-2.5 focus:outline-none transition-colors text-sm mb-4 font-mono"
                    autoFocus
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setShowDeleteModal(false);
                        setDeleteConfirmText("");
                      }}
                      disabled={deleting}
                      className="flex-1 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold py-2.5 px-4 transition-all uppercase tracking-wider text-xs"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDeleteAccount}
                      disabled={deleteConfirmText !== "DELETE" || deleting}
                      className="flex-1 bg-red-900/50 hover:bg-red-800/60 border border-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-red-300 font-bold py-2.5 px-4 transition-all uppercase tracking-wider text-xs"
                    >
                      {deleting ? "Deleting..." : "Permanently Delete"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
