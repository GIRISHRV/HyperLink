"use client";

import { useState, useEffect } from "react";
import { useRequireAuth } from "@/lib/hooks/use-require-auth";
import { supabase } from "@/lib/supabase/client";
import AppHeader from "@/components/app-header";
import Link from "next/link";

export default function AdminDashboardPage() {
  const { user } = useRequireAuth();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [stats, setStats] = useState({
    totalIncidents: 0,
    activeIncidents: 0,
    resolvedIncidents: 0,
  });

  useEffect(() => {
    if (!user) return;

    const checkAdminStatus = async () => {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("is_admin")
        .eq("user_id", user.id)
        .single();

      if (!error && data) {
        setIsAdmin(data.is_admin || false);
      }
      setLoading(false);
    };

    const fetchStats = async () => {
      const { data: incidents } = await supabase.from("incidents").select("status");

      if (incidents) {
        setStats({
          totalIncidents: incidents.length,
          activeIncidents: incidents.filter((i) => i.status !== "resolved").length,
          resolvedIncidents: incidents.filter((i) => i.status === "resolved").length,
        });
      }
    };

    checkAdminStatus();
    fetchStats();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background text-white">
        <AppHeader variant="app" />
        <main className="max-w-6xl mx-auto p-6 py-12">
          <div className="bg-bauhaus-red/10 border-l-4 border-bauhaus-red p-8 text-center">
            <div className="w-24 h-24 mx-auto mb-6 bg-bauhaus-red/20 border border-bauhaus-red/30 flex items-center justify-center">
              <span className="material-symbols-outlined text-bauhaus-red text-5xl">block</span>
            </div>
            <h1 className="text-3xl font-black uppercase tracking-tight mb-3">Access Denied</h1>
            <p className="text-gray-400 mb-6">You need admin privileges to access this page.</p>
            <p className="text-sm text-gray-500 font-mono">
              Contact the system administrator to request admin access.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-white">
      <AppHeader variant="app" />

      <main className="max-w-6xl mx-auto p-6 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-black uppercase tracking-tight mb-2">Admin Dashboard</h1>
          <p className="text-gray-400 text-sm font-mono">System administration and management</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-surface border border-subtle p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-bauhaus-blue/20 border border-bauhaus-blue/30 flex items-center justify-center">
                <span className="material-symbols-outlined text-bauhaus-blue text-2xl">
                  list_alt
                </span>
              </div>
              <div>
                <div className="text-3xl font-black text-bauhaus-blue">{stats.totalIncidents}</div>
                <div className="text-xs text-gray-400 uppercase font-bold">Total Incidents</div>
              </div>
            </div>
          </div>

          <div className="bg-surface border border-subtle p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-bauhaus-yellow/20 border border-bauhaus-yellow/30 flex items-center justify-center">
                <span className="material-symbols-outlined text-bauhaus-yellow text-2xl">
                  warning
                </span>
              </div>
              <div>
                <div className="text-3xl font-black text-bauhaus-yellow">
                  {stats.activeIncidents}
                </div>
                <div className="text-xs text-gray-400 uppercase font-bold">Active Incidents</div>
              </div>
            </div>
          </div>

          <div className="bg-surface border border-subtle p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-green-500/20 border border-green-500/30 flex items-center justify-center">
                <span className="material-symbols-outlined text-green-500 text-2xl">
                  check_circle
                </span>
              </div>
              <div>
                <div className="text-3xl font-black text-green-500">{stats.resolvedIncidents}</div>
                <div className="text-xs text-gray-400 uppercase font-bold">Resolved</div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-surface border border-subtle p-6 mb-8">
          <h2 className="text-xl font-black uppercase tracking-tight mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link
              href="/admin/incidents"
              className="bg-surface-inset border border-subtle hover:border-bauhaus-blue p-6 flex items-center gap-4 transition-colors group"
            >
              <div className="w-16 h-16 bg-bauhaus-blue/20 border border-bauhaus-blue/30 flex items-center justify-center shrink-0 group-hover:bg-bauhaus-blue/30 transition-colors">
                <span className="material-symbols-outlined text-bauhaus-blue text-3xl">report</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-1">Manage Incidents</h3>
                <p className="text-sm text-gray-400">Create and update service incidents</p>
              </div>
            </Link>

            <Link
              href="/status"
              className="bg-surface-inset border border-subtle hover:border-primary p-6 flex items-center gap-4 transition-colors group"
            >
              <div className="w-16 h-16 bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0 group-hover:bg-primary/30 transition-colors">
                <span className="material-symbols-outlined text-primary text-3xl">
                  monitor_heart
                </span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-1">View Status Page</h3>
                <p className="text-sm text-gray-400">See public status page</p>
              </div>
            </Link>
          </div>
        </div>

        {/* Admin Info */}
        <div className="bg-bauhaus-blue/5 border border-bauhaus-blue/20 p-6">
          <div className="flex items-start gap-4">
            <span className="material-symbols-outlined text-bauhaus-blue text-2xl shrink-0">
              info
            </span>
            <div>
              <p className="text-sm text-gray-300 mb-2">
                <span className="font-bold text-white">Admin Access:</span> You have administrative
                privileges to manage system incidents and status updates.
              </p>
              <p className="text-xs text-gray-400 font-mono">Logged in as: {user?.email}</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
