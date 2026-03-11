"use client";

import { useState, useEffect } from "react";
import AppHeader from "@/components/app-header";

interface HealthData {
  status: string;
  service: string;
  uptime: number;
  timestamp: string;
  peers?: number;
}

interface BrowserCompatibility {
  webrtc: boolean;
  secureContext: boolean;
  notifications: boolean;
  serviceWorker: boolean;
  webWorkers: boolean;
}

interface ServiceComponent {
  name: string;
  status: "operational" | "degraded" | "down";
  icon: string;
  description: string;
}

interface HealthCheck {
  success: boolean;
  timestamp: number;
  responseTime: number | null;
}

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

export default function StatusPage() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [browserCompat, setBrowserCompat] = useState<BrowserCompatibility | null>(null);
  const [countdown, setCountdown] = useState(10);
  const [responseTime, setResponseTime] = useState<number | null>(null);
  const [healthHistory, setHealthHistory] = useState<HealthCheck[]>([]);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionTestResult, setConnectionTestResult] = useState<string | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(() => {
    // Load preference from localStorage
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("status-auto-refresh");
      return saved === null ? true : saved === "true";
    }
    return true;
  });

  useEffect(() => {
    // Check browser compatibility
    const checkBrowserCompat = () => {
      const compat: BrowserCompatibility = {
        webrtc: !!(window.RTCPeerConnection || (window as any).webkitRTCPeerConnection),
        secureContext: window.isSecureContext === true,
        notifications: "Notification" in window,
        serviceWorker: "serviceWorker" in navigator,
        webWorkers: typeof Worker !== "undefined",
      };
      setBrowserCompat(compat);
    };

    checkBrowserCompat();

    // Fetch incidents
    const fetchIncidents = async () => {
      try {
        const response = await fetch("/api/incidents");
        if (response.ok) {
          const data = await response.json();
          setIncidents(data.incidents || []);
        }
      } catch (err) {
        console.error("Failed to fetch incidents:", err);
      }
    };

    fetchIncidents();

    const checkHealth = async () => {
      try {
        const protocol = window.location.protocol === "https:" ? "https" : "http";
        const host = process.env.NEXT_PUBLIC_PEER_SERVER_HOST;
        const port = process.env.NEXT_PUBLIC_PEER_SERVER_PORT;

        // Measure response time
        const startTime = performance.now();
        const response = await fetch(`${protocol}://${host}:${port}/health`);
        const endTime = performance.now();
        const latency = Math.round(endTime - startTime);

        if (response.ok) {
          const data = await response.json();
          setHealth(data);
          setResponseTime(latency);
          setError(false);

          // Add to history (keep last 10)
          setHealthHistory((prev) => {
            const newCheck: HealthCheck = {
              success: true,
              timestamp: Date.now(),
              responseTime: latency,
            };
            return [...prev, newCheck].slice(-10);
          });
        } else {
          setError(true);
          setResponseTime(null);

          // Add failed check to history
          setHealthHistory((prev) => {
            const newCheck: HealthCheck = {
              success: false,
              timestamp: Date.now(),
              responseTime: null,
            };
            return [...prev, newCheck].slice(-10);
          });
        }
      } catch (err) {
        setError(true);
        setResponseTime(null);

        // Add failed check to history
        setHealthHistory((prev) => {
          const newCheck: HealthCheck = {
            success: false,
            timestamp: Date.now(),
            responseTime: null,
          };
          return [...prev, newCheck].slice(-10);
        });
      } finally {
        setLoading(false);
        setCountdown(10); // Reset countdown after check
      }
    };

    checkHealth();

    // Only set up auto-refresh interval if enabled
    let healthInterval: NodeJS.Timeout | null = null;
    if (autoRefreshEnabled) {
      healthInterval = setInterval(checkHealth, 10000); // Check every 10s
    }

    // Countdown timer - only runs if auto-refresh is enabled
    const countdownInterval = setInterval(() => {
      setCountdown((prev) => {
        if (!autoRefreshEnabled) return 10; // Keep at 10 when paused
        return prev > 0 ? prev - 1 : 10;
      });
    }, 1000);

    return () => {
      if (healthInterval) clearInterval(healthInterval);
      clearInterval(countdownInterval);
    };
  }, [autoRefreshEnabled]);

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);

    if (days > 0) return `${days}d ${hours}h ${mins}m`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  const getResponseTimeStatus = (ms: number | null) => {
    if (ms === null)
      return {
        label: "Unknown",
        color: "text-gray-500",
        bg: "bg-gray-500/10",
        border: "border-gray-500/30",
      };
    if (ms < 100)
      return {
        label: "Excellent",
        color: "text-green-500",
        bg: "bg-green-500/10",
        border: "border-green-500/30",
      };
    if (ms < 300)
      return {
        label: "Good",
        color: "text-bauhaus-blue",
        bg: "bg-bauhaus-blue/10",
        border: "border-bauhaus-blue/30",
      };
    if (ms < 500)
      return {
        label: "Fair",
        color: "text-bauhaus-yellow",
        bg: "bg-bauhaus-yellow/10",
        border: "border-bauhaus-yellow/30",
      };
    return {
      label: "Slow",
      color: "text-bauhaus-red",
      bg: "bg-bauhaus-red/10",
      border: "border-bauhaus-red/30",
    };
  };

  const manualRefresh = async () => {
    setLoading(true);
    setCountdown(10);

    try {
      const protocol = window.location.protocol === "https:" ? "https" : "http";
      const host = process.env.NEXT_PUBLIC_PEER_SERVER_HOST;
      const port = process.env.NEXT_PUBLIC_PEER_SERVER_PORT;

      const startTime = performance.now();
      const response = await fetch(`${protocol}://${host}:${port}/health`);
      const endTime = performance.now();
      const latency = Math.round(endTime - startTime);

      if (response.ok) {
        const data = await response.json();
        setHealth(data);
        setResponseTime(latency);
        setError(false);

        setHealthHistory((prev) => {
          const newCheck: HealthCheck = {
            success: true,
            timestamp: Date.now(),
            responseTime: latency,
          };
          return [...prev, newCheck].slice(-10);
        });
      } else {
        setError(true);
        setResponseTime(null);

        setHealthHistory((prev) => {
          const newCheck: HealthCheck = {
            success: false,
            timestamp: Date.now(),
            responseTime: null,
          };
          return [...prev, newCheck].slice(-10);
        });
      }
    } catch (err) {
      setError(true);
      setResponseTime(null);

      setHealthHistory((prev) => {
        const newCheck: HealthCheck = { success: false, timestamp: Date.now(), responseTime: null };
        return [...prev, newCheck].slice(-10);
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleAutoRefresh = () => {
    const newValue = !autoRefreshEnabled;
    setAutoRefreshEnabled(newValue);
    localStorage.setItem("status-auto-refresh", String(newValue));
    if (newValue) {
      setCountdown(10); // Reset countdown when re-enabling
    }
  };

  const testConnection = async () => {
    setTestingConnection(true);
    setConnectionTestResult(null);

    try {
      // Test 1: Check WebRTC support
      if (!browserCompat?.webrtc) {
        setConnectionTestResult("❌ WebRTC not supported in your browser");
        return;
      }

      // Test 2: Check secure context
      if (!browserCompat?.secureContext) {
        setConnectionTestResult("❌ Secure context (HTTPS) required for WebRTC");
        return;
      }

      // Test 3: Try to create RTCPeerConnection
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });

      // Test 4: Create data channel
      const channel = pc.createDataChannel("test");

      // Test 5: Create offer
      await pc.createOffer();

      // Cleanup
      channel.close();
      pc.close();

      setConnectionTestResult("✅ All connection tests passed! You can transfer files.");
    } catch (err) {
      setConnectionTestResult(
        `❌ Connection test failed: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    } finally {
      setTestingConnection(false);
    }
  };

  // Determine service components status based on health check
  const getServiceComponents = (): ServiceComponent[] => {
    const signalingStatus: "operational" | "degraded" | "down" = error ? "down" : "operational";

    return [
      {
        name: "WebRTC Signaling",
        status: signalingStatus,
        icon: "router",
        description: "Peer connection coordination",
      },
      {
        name: "Authentication",
        status: signalingStatus === "down" ? "down" : "operational",
        icon: "shield",
        description: "User verification service",
      },
      {
        name: "Database",
        status: signalingStatus === "down" ? "down" : "operational",
        icon: "storage",
        description: "Transfer history & metadata",
      },
      {
        name: "P2P Network",
        status: browserCompat?.webrtc ? "operational" : "degraded",
        icon: "share",
        description: "Direct peer-to-peer transfers",
      },
    ];
  };

  const serviceComponents = getServiceComponents();

  return (
    <div className="bg-transparent min-h-screen text-background-dark dark:text-white overflow-x-hidden font-display flex flex-col">
      <AppHeader variant="landing" />

      {/* Main Content */}
      <main className="flex-grow p-6 py-12">
        <div className="w-full max-w-[1400px] mx-auto">
          {/* Title Section */}
          <div className="mb-12 text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="h-1 w-12 bg-bauhaus-red"></div>
              <span className="text-xs font-bold uppercase tracking-widest text-gray-500">
                System Monitor
              </span>
              <div className="h-1 w-12 bg-bauhaus-red"></div>
            </div>
            <h1 className="text-5xl md:text-7xl font-black leading-[0.9] tracking-tighter uppercase mb-4">
              System{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-bauhaus-blue to-primary">
                Status
              </span>
            </h1>
            <p className="text-base md:text-lg font-medium text-gray-400 max-w-2xl mx-auto leading-relaxed">
              Real-time monitoring of P2P infrastructure and services
            </p>

            {/* Auto-refresh indicator & Manual refresh */}
            {!loading && (
              <div className="flex items-center justify-center gap-4 mt-6">
                <div className="flex items-center gap-2 text-xs text-gray-500 font-mono">
                  <span className="material-symbols-outlined text-sm">schedule</span>
                  {autoRefreshEnabled ? `Refreshing in ${countdown}s` : "Auto-refresh paused"}
                </div>
                <button
                  onClick={toggleAutoRefresh}
                  className={`flex items-center gap-2 px-4 py-2 border text-xs font-bold uppercase tracking-wider transition-colors ${
                    autoRefreshEnabled
                      ? "bg-surface border-subtle hover:border-bauhaus-yellow text-white"
                      : "bg-bauhaus-blue/20 border-bauhaus-blue hover:bg-bauhaus-blue/30 text-bauhaus-blue"
                  }`}
                >
                  <span className="material-symbols-outlined text-sm">
                    {autoRefreshEnabled ? "pause" : "play_arrow"}
                  </span>
                  {autoRefreshEnabled ? "Pause" : "Resume"}
                </button>
                <button
                  onClick={manualRefresh}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 bg-surface border border-subtle hover:border-primary text-white text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-sm">refresh</span>
                  Refresh Now
                </button>
              </div>
            )}
          </div>

          {/* Status Display */}
          {loading ? (
            <div className="bg-surface border border-subtle p-16 text-center">
              <div className="inline-block size-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-6"></div>
              <p className="text-gray-400 font-mono text-sm uppercase tracking-wider">
                Checking network status...
              </p>
            </div>
          ) : error ? (
            <div className="space-y-6">
              {/* Error Status Banner */}
              <div className="bg-bauhaus-red/10 border-l-4 border-bauhaus-red p-8 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-bauhaus-red/20 border border-bauhaus-red/30 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-bauhaus-red text-3xl">
                      error
                    </span>
                  </div>
                  <div>
                    <h3 className="text-2xl font-black uppercase tracking-tight text-white mb-1">
                      System Offline
                    </h3>
                    <p className="text-gray-400 text-sm font-mono">
                      Unable to connect to signaling server
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 px-6 py-3 bg-bauhaus-red/20 border border-bauhaus-red/30">
                  <div className="flex h-3 w-3 relative">
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-bauhaus-red"></span>
                  </div>
                  <span className="text-bauhaus-red font-black uppercase text-sm tracking-wider">
                    Offline
                  </span>
                </div>
              </div>
            </div>
          ) : health ? (
            <div className="space-y-6">
              {/* Overall Status Banner */}
              <div className="bg-gradient-to-r from-green-500/10 to-bauhaus-blue/10 border-l-4 border-green-500 p-6">
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-green-500/20 border border-green-500/30 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-green-500 text-2xl">
                        check_circle
                      </span>
                    </div>
                    <div>
                      <h3 className="text-xl lg:text-2xl font-black uppercase tracking-tight text-white mb-1">
                        All Systems Operational
                      </h3>
                      <p className="text-gray-400 text-xs font-mono">
                        Last checked: {new Date(health.timestamp).toLocaleString()}
                      </p>

                      {/* Historical Status Dots */}
                      {healthHistory.length > 0 && (
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-gray-500 font-mono">History:</span>
                          <div className="flex items-center gap-1">
                            {healthHistory.map((check, idx) => (
                              <div
                                key={idx}
                                className={`w-2 h-2 rounded-full ${check.success ? "bg-green-500" : "bg-bauhaus-red"}`}
                                title={`${check.success ? "Success" : "Failed"} - ${new Date(check.timestamp).toLocaleTimeString()}${check.responseTime ? ` (${check.responseTime}ms)` : ""}`}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 px-4 py-2 bg-green-500/20 border border-green-500/30">
                    <div className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </div>
                    <span className="text-green-400 font-black uppercase text-xs tracking-wider">
                      Online
                    </span>
                  </div>
                </div>
              </div>

              {/* Main Grid Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Left Column - Metrics (3/4 width) */}
                <div className="lg:col-span-3 space-y-6">
                  {/* Service Components */}
                  <div className="bg-surface border border-subtle p-6">
                    <h3 className="text-base font-black uppercase tracking-tight text-white mb-4 flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-lg">
                        dashboard
                      </span>
                      Service Components
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {serviceComponents.map((component) => {
                        const statusColors = {
                          operational: {
                            bg: "bg-green-500/10",
                            border: "border-green-500/30",
                            text: "text-green-500",
                            dot: "bg-green-500",
                          },
                          degraded: {
                            bg: "bg-bauhaus-yellow/10",
                            border: "border-bauhaus-yellow/30",
                            text: "text-bauhaus-yellow",
                            dot: "bg-bauhaus-yellow",
                          },
                          down: {
                            bg: "bg-bauhaus-red/10",
                            border: "border-bauhaus-red/30",
                            text: "text-bauhaus-red",
                            dot: "bg-bauhaus-red",
                          },
                        };
                        const colors = statusColors[component.status];

                        return (
                          <div
                            key={component.name}
                            className="bg-surface-inset border border-subtle p-3 flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2">
                              <span className={`material-symbols-outlined ${colors.text} text-lg`}>
                                {component.icon}
                              </span>
                              <div>
                                <h4 className="text-white font-bold text-xs">{component.name}</h4>
                                <p className="text-xs text-gray-500 font-mono">
                                  {component.description}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <div
                                className={`w-1.5 h-1.5 rounded-full ${colors.dot} ${component.status === "operational" ? "animate-pulse" : ""}`}
                              ></div>
                              <span className={`${colors.text} text-xs font-bold uppercase`}>
                                {component.status}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Browser Compatibility */}
                  {browserCompat && (
                    <div className="bg-surface border border-subtle p-6">
                      <h3 className="text-base font-black uppercase tracking-tight text-white mb-4 flex items-center gap-2">
                        <span className="material-symbols-outlined text-bauhaus-yellow text-lg">
                          web
                        </span>
                        Browser Compatibility
                      </h3>

                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {[
                          { name: "WebRTC", supported: browserCompat.webrtc, critical: true },
                          { name: "HTTPS", supported: browserCompat.secureContext, critical: true },
                          {
                            name: "Notifications",
                            supported: browserCompat.notifications,
                            critical: false,
                          },
                          {
                            name: "Service Workers",
                            supported: browserCompat.serviceWorker,
                            critical: false,
                          },
                          {
                            name: "Web Workers",
                            supported: browserCompat.webWorkers,
                            critical: false,
                          },
                        ].map((feature) => (
                          <div
                            key={feature.name}
                            className="bg-surface-inset border border-subtle p-2 flex items-center justify-between"
                          >
                            <span className="text-xs font-medium text-white">{feature.name}</span>
                            <span
                              className={`material-symbols-outlined text-sm ${feature.supported ? "text-green-500" : "text-bauhaus-red"}`}
                            >
                              {feature.supported ? "check_circle" : "cancel"}
                            </span>
                          </div>
                        ))}
                      </div>

                      {(!browserCompat.webrtc || !browserCompat.secureContext) && (
                        <div className="mt-3 bg-bauhaus-red/10 border border-bauhaus-red/30 p-3 flex items-start gap-2">
                          <span className="material-symbols-outlined text-bauhaus-red text-sm shrink-0">
                            warning
                          </span>
                          <p className="text-xs text-gray-300 font-mono">
                            {!browserCompat.webrtc && "WebRTC not supported. "}
                            {!browserCompat.secureContext && "HTTPS required. "}
                          </p>
                        </div>
                      )}

                      {/* Connection Test */}
                      <div className="mt-3 pt-3 border-t border-subtle">
                        <button
                          onClick={testConnection}
                          disabled={testingConnection}
                          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-bauhaus-blue/20 border border-bauhaus-blue/30 hover:bg-bauhaus-blue/30 text-bauhaus-blue text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
                        >
                          <span className="material-symbols-outlined text-sm">speed</span>
                          {testingConnection ? "Testing..." : "Test Connection"}
                        </button>

                        {connectionTestResult && (
                          <div
                            className={`mt-2 p-2 text-xs font-mono ${connectionTestResult.startsWith("✅") ? "bg-green-500/10 border border-green-500/30 text-green-500" : "bg-bauhaus-red/10 border border-bauhaus-red/30 text-bauhaus-red"}`}
                          >
                            {connectionTestResult}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Column - Live Stats (1/4 width) */}
                <div className="space-y-6">
                  {/* Live Activity */}
                  <div className="bg-surface border border-subtle p-4">
                    <h3 className="text-sm font-black uppercase tracking-tight text-white mb-3 flex items-center gap-2">
                      <span className="material-symbols-outlined text-bauhaus-blue text-base">
                        group
                      </span>
                      Live Activity
                    </h3>

                    <div className="space-y-3">
                      <div className="bg-bauhaus-blue/10 border border-bauhaus-blue/30 p-3 text-center">
                        <div className="text-3xl font-black text-bauhaus-blue mb-1">
                          {health.peers || 0}
                        </div>
                        <div className="text-xs text-gray-400 uppercase font-bold">Peers</div>
                      </div>

                      <div className="bg-primary/10 border border-primary/30 p-3 text-center">
                        <div className="text-3xl font-black text-primary mb-1">
                          {Math.floor((health.peers || 0) / 2)}
                        </div>
                        <div className="text-xs text-gray-400 uppercase font-bold">Transfers</div>
                      </div>
                    </div>
                  </div>

                  {/* Server Info */}
                  <div className="bg-surface border border-subtle p-4">
                    <h3 className="text-sm font-black uppercase tracking-tight text-white mb-3 flex items-center gap-2">
                      <span className="material-symbols-outlined text-green-500 text-base">
                        dns
                      </span>
                      Server
                    </h3>

                    <div className="space-y-2">
                      <div className="bg-surface-inset border border-subtle p-2">
                        <div className="text-xs text-gray-500 uppercase font-bold mb-0.5">
                          Uptime
                        </div>
                        <div className="text-sm font-bold text-white">
                          {formatUptime(health.uptime)}
                        </div>
                      </div>

                      <div className="bg-surface-inset border border-subtle p-2">
                        <div className="text-xs text-gray-500 uppercase font-bold mb-0.5">
                          Status
                        </div>
                        <div className="text-sm font-bold text-green-500 uppercase">
                          {health.status}
                        </div>
                      </div>

                      {/* Response Time */}
                      <div
                        className={`${getResponseTimeStatus(responseTime).bg} border ${getResponseTimeStatus(responseTime).border} p-2`}
                      >
                        <div className="text-xs text-gray-500 uppercase font-bold mb-0.5">
                          Latency
                        </div>
                        <div className="flex items-baseline gap-1.5">
                          <div
                            className={`text-sm font-bold ${getResponseTimeStatus(responseTime).color}`}
                          >
                            {responseTime !== null ? `${responseTime}ms` : "—"}
                          </div>
                          <div
                            className={`text-xs font-bold uppercase ${getResponseTimeStatus(responseTime).color}`}
                          >
                            {getResponseTimeStatus(responseTime).label}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Incident History */}
              {incidents.length > 0 && (
                <div className="bg-surface border border-subtle p-6">
                  <h3 className="text-base font-black uppercase tracking-tight text-white mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-bauhaus-yellow text-lg">
                      history
                    </span>
                    Recent Incidents
                  </h3>

                  <div className="space-y-2">
                    {incidents.slice(0, 5).map((incident) => {
                      const severityColors = {
                        minor: {
                          bg: "bg-bauhaus-blue/10",
                          border: "border-bauhaus-blue/30",
                          text: "text-bauhaus-blue",
                          icon: "info",
                        },
                        major: {
                          bg: "bg-bauhaus-yellow/10",
                          border: "border-bauhaus-yellow/30",
                          text: "text-bauhaus-yellow",
                          icon: "warning",
                        },
                        critical: {
                          bg: "bg-bauhaus-red/10",
                          border: "border-bauhaus-red/30",
                          text: "text-bauhaus-red",
                          icon: "error",
                        },
                      };
                      const colors = severityColors[incident.severity];

                      const statusColors = {
                        investigating: "text-bauhaus-red",
                        identified: "text-bauhaus-yellow",
                        monitoring: "text-bauhaus-blue",
                        resolved: "text-green-500",
                      };

                      return (
                        <div
                          key={incident.id}
                          className={`${colors.bg} border ${colors.border} p-3`}
                        >
                          <div className="flex items-start gap-2">
                            <span
                              className={`material-symbols-outlined ${colors.text} text-base shrink-0 mt-0.5`}
                            >
                              {colors.icon}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <h4 className="text-white font-bold text-sm">{incident.title}</h4>
                                <span
                                  className={`${statusColors[incident.status]} text-xs font-bold uppercase shrink-0`}
                                >
                                  {incident.status}
                                </span>
                              </div>
                              <p className="text-xs text-gray-300 mb-1">{incident.description}</p>
                              <div className="flex items-center gap-3 text-xs text-gray-500 font-mono">
                                <span>{new Date(incident.started_at).toLocaleDateString()}</span>
                                {incident.resolved_at && (
                                  <span className="text-green-500">
                                    Resolved: {new Date(incident.resolved_at).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Info Footer & Quick Actions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-bauhaus-blue/5 border border-bauhaus-blue/20 p-4">
                  <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-bauhaus-blue text-xl shrink-0">
                      info
                    </span>
                    <div>
                      <p className="text-xs text-gray-300 leading-relaxed font-medium mb-1">
                        <span className="font-bold text-white">Privacy First:</span> Zero-knowledge
                        architecture.
                      </p>
                      <p className="text-xs text-gray-400 font-mono">
                        Signaling server only coordinates connections. Files transfer peer-to-peer
                        with E2E encryption.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-surface border border-subtle p-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
                    Quick Links
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    <a
                      href="/about"
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-inset border border-subtle hover:border-bauhaus-blue text-white text-xs font-bold uppercase tracking-wider transition-colors"
                    >
                      <span className="material-symbols-outlined text-xs">info</span>
                      Docs
                    </a>
                    <a
                      href="https://github.com/GIRISHRV/hyperlink/issues"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-inset border border-subtle hover:border-bauhaus-red text-white text-xs font-bold uppercase tracking-wider transition-colors"
                    >
                      <span className="material-symbols-outlined text-xs">bug_report</span>
                      Report
                    </a>
                    <a
                      href="mailto:girish29052005@gmail.com"
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-inset border border-subtle hover:border-primary text-white text-xs font-bold uppercase tracking-wider transition-colors"
                    >
                      <span className="material-symbols-outlined text-xs">support_agent</span>
                      Support
                    </a>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
          {/* Overall Status Banner */}
        </div>
      </main>
    </div>
  );
}
