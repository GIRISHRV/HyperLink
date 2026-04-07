"use client";

import { useState, useEffect } from "react";
import { useRequireAuth } from "@/lib/hooks/use-require-auth";
import { supabase } from "@/lib/supabase/client";
import AppHeader from "@/components/app-header";

interface Incident {
  id: string;
  title: string;
  description: string;
  status: "investigating" | "identified" | "monitoring" | "resolved";
  severity: "minor" | "major" | "critical";
  started_at: string;
  resolved_at: string | null;
  created_at: string;
}

export default function IncidentsAdminPage() {
  const { user } = useRequireAuth();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    status: "investigating" as const,
    severity: "minor" as const,
    started_at: new Date().toISOString().slice(0, 16),
    resolved_at: "",
  });

  const fetchIncidents = async () => {
    const { data, error } = await supabase
      .from("incidents")
      .select("*")
      .order("started_at", { ascending: false });

    if (!error && data) {
      setIncidents(data);
    }
    setLoading(false);
  };

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
    };

    checkAdminStatus();
    fetchIncidents();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const incident = {
      ...formData,
      resolved_at: formData.resolved_at || null,
    };

    const { error } = await supabase.from("incidents").insert([incident]);

    if (!error) {
      setShowForm(false);
      setFormData({
        title: "",
        description: "",
        status: "investigating",
        severity: "minor",
        started_at: new Date().toISOString().slice(0, 16),
        resolved_at: "",
      });
      fetchIncidents();
    } else {
      alert("Error creating incident: " + error.message);
    }
  };

  const updateStatus = async (id: string, status: string, resolved: boolean) => {
    const updates: any = { status };

    if (resolved && status === "resolved") {
      updates.resolved_at = new Date().toISOString();
    }

    const { error } = await supabase.from("incidents").update(updates).eq("id", id);

    if (!error) {
      fetchIncidents();
    }
  };

  const deleteIncident = async (id: string) => {
    if (!confirm("Are you sure you want to delete this incident? This cannot be undone.")) {
      return;
    }

    const { error } = await supabase.from("incidents").delete().eq("id", id);

    if (!error) {
      fetchIncidents();
    } else {
      alert("Error deleting incident: " + error.message);
    }
  };

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
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-black uppercase tracking-tight mb-2">
              Incident Management
            </h1>
            <p className="text-gray-400 text-sm font-mono">
              Manage status page incidents and maintenance events
            </p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-6 py-3 bg-primary text-black font-bold uppercase tracking-wider hover:bg-white transition-colors"
          >
            {showForm ? "Cancel" : "New Incident"}
          </button>
        </div>

        {/* Create Form */}
        {showForm && (
          <div className="bg-surface border border-subtle p-6 mb-8">
            <h2 className="text-xl font-black uppercase mb-4">Create Incident</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-2">Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-surface-inset border border-subtle p-3 text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-surface-inset border border-subtle p-3 text-white h-24"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold mb-2">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full bg-surface-inset border border-subtle p-3 text-white"
                  >
                    <option value="investigating">Investigating</option>
                    <option value="identified">Identified</option>
                    <option value="monitoring">Monitoring</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2">Severity</label>
                  <select
                    value={formData.severity}
                    onChange={(e) => setFormData({ ...formData, severity: e.target.value as any })}
                    className="w-full bg-surface-inset border border-subtle p-3 text-white"
                  >
                    <option value="minor">Minor</option>
                    <option value="major">Major</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold mb-2">Started At</label>
                  <input
                    type="datetime-local"
                    value={formData.started_at}
                    onChange={(e) => setFormData({ ...formData, started_at: e.target.value })}
                    className="w-full bg-surface-inset border border-subtle p-3 text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2">Resolved At (optional)</label>
                  <input
                    type="datetime-local"
                    value={formData.resolved_at}
                    onChange={(e) => setFormData({ ...formData, resolved_at: e.target.value })}
                    className="w-full bg-surface-inset border border-subtle p-3 text-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-primary text-black font-bold uppercase tracking-wider hover:bg-white transition-colors"
              >
                Create Incident
              </button>
            </form>
          </div>
        )}

        {/* Incidents List */}
        <div className="space-y-4">
          {incidents.map((incident) => {
            const severityColors = {
              minor: {
                bg: "bg-bauhaus-blue/10",
                border: "border-bauhaus-blue/30",
                text: "text-bauhaus-blue",
              },
              major: {
                bg: "bg-bauhaus-yellow/10",
                border: "border-bauhaus-yellow/30",
                text: "text-bauhaus-yellow",
              },
              critical: {
                bg: "bg-bauhaus-red/10",
                border: "border-bauhaus-red/30",
                text: "text-bauhaus-red",
              },
            };
            const colors = severityColors[incident.severity];

            return (
              <div key={incident.id} className={`${colors.bg} border ${colors.border} p-6`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-black uppercase text-white">{incident.title}</h3>
                      <span
                        className={`px-2 py-1 text-xs font-bold uppercase ${colors.text} border ${colors.border}`}
                      >
                        {incident.severity}
                      </span>
                      <span className="px-2 py-1 text-xs font-bold uppercase text-gray-400 border border-subtle">
                        {incident.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-300 mb-3">{incident.description}</p>
                    <div className="text-xs text-gray-500 font-mono space-y-1">
                      <p>Started: {new Date(incident.started_at).toLocaleString()}</p>
                      {incident.resolved_at && (
                        <p>Resolved: {new Date(incident.resolved_at).toLocaleString()}</p>
                      )}
                    </div>
                  </div>
                </div>

                {incident.status !== "resolved" && (
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => updateStatus(incident.id, "identified", false)}
                      className="px-4 py-2 bg-surface-inset border border-subtle text-white text-xs font-bold uppercase hover:border-white transition-colors"
                    >
                      Mark Identified
                    </button>
                    <button
                      onClick={() => updateStatus(incident.id, "monitoring", false)}
                      className="px-4 py-2 bg-surface-inset border border-subtle text-white text-xs font-bold uppercase hover:border-white transition-colors"
                    >
                      Mark Monitoring
                    </button>
                    <button
                      onClick={() => updateStatus(incident.id, "resolved", true)}
                      className="px-4 py-2 bg-green-500/20 border border-green-500/30 text-green-500 text-xs font-bold uppercase hover:bg-green-500/30 transition-colors"
                    >
                      Mark Resolved
                    </button>
                  </div>
                )}

                {/* Delete button - always visible */}
                <div className="flex justify-end mt-4">
                  <button
                    onClick={() => deleteIncident(incident.id)}
                    className="px-4 py-2 bg-bauhaus-red/20 border border-bauhaus-red/30 text-bauhaus-red text-xs font-bold uppercase hover:bg-bauhaus-red/30 transition-colors"
                  >
                    Delete Incident
                  </button>
                </div>
              </div>
            );
          })}

          {incidents.length === 0 && (
            <div className="bg-surface border border-subtle p-12 text-center">
              <p className="text-gray-400">No incidents recorded</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
