"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/lib/services/auth-service";
import { useRouter } from "next/navigation";

interface AppHeaderProps {
  userEmail?: string;
}

export default function AppHeader({ userEmail }: AppHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.push("/");
  }

  const isActive = (path: string) => pathname === path;

  return (
    <nav className="w-full border-b border-[#4b4520] bg-[#24210f] px-6 py-4 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="bg-primary text-[#23200f] p-1 rounded-sm">
            <span className="material-symbols-outlined text-3xl">hub</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white uppercase">HyperLink</h1>
        </Link>

        {/* Navigation */}
        <div className="hidden md:flex items-center gap-8">
          <Link
            href="/dashboard"
            className={
              isActive("/dashboard")
                ? "text-primary font-bold border-b-2 border-primary pb-0.5"
                : "text-gray-400 hover:text-white transition-colors font-medium"
            }
          >
            Home
          </Link>
          <Link
            href="/send"
            className={
              isActive("/send")
                ? "text-primary font-bold border-b-2 border-primary pb-0.5"
                : "text-gray-400 hover:text-white transition-colors font-medium"
            }
          >
            Send
          </Link>
          <Link
            href="/receive"
            className={
              isActive("/receive")
                ? "text-primary font-bold border-b-2 border-primary pb-0.5"
                : "text-gray-400 hover:text-white transition-colors font-medium"
            }
          >
            Receive
          </Link>
          <Link
            href="/history"
            className={
              isActive("/history")
                ? "text-primary font-bold border-b-2 border-primary pb-0.5"
                : "text-gray-400 hover:text-white transition-colors font-medium"
            }
          >
            History
          </Link>
          <Link
            href="/settings"
            className={
              isActive("/settings")
                ? "text-primary font-bold border-b-2 border-primary pb-0.5"
                : "text-gray-400 hover:text-white transition-colors font-medium"
            }
          >
            Settings
          </Link>
        </div>

        {/* User Profile */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex flex-col items-end mr-2">
            <span className="text-sm font-bold text-white leading-none">
              {userEmail?.split("@")[0] || "User"}
            </span>
          </div>
          <button
            onClick={handleSignOut}
            className="size-10 bg-gray-700 rounded-full border-2 border-primary overflow-hidden relative flex items-center justify-center text-white hover:bg-gray-600 transition-colors"
          >
            <span className="material-symbols-outlined">logout</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
