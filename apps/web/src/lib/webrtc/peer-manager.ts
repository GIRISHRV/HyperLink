import Peer, { type DataConnection } from "peerjs";
import type { PeerConfig, ConnectionState } from "@repo/types";
import { logger } from "@repo/utils";

export class PeerManager {
  private peer: Peer | null = null;
  private connections: Map<string, DataConnection> = new Map();
  private connectionState: ConnectionState = "disconnected";
  private eventListeners: Map<string, Set<(...args: unknown[]) => void>> = new Map();

  private isDestroyed: boolean = false;
  private initializationPromise: Promise<string> | null = null;
  private lastIceCandidates: RTCIceCandidate[] = []; // Task #4: Track candidates for diagnostics

  // Reconnection state
  private static readonly MAX_RECONNECT_ATTEMPTS = 5;
  private static readonly BASE_DELAY_MS = 1000;
  private static readonly MAX_DELAY_MS = 30000;
  private reconnectAttempts: number = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private isReconnecting: boolean = false;

  /**
   * Generate a cryptographically secure random ID
   * Fallback for Task #9
   */
  public static getRandomId(prefix: string = "hl"): string {
    try {
      const cryptoObj =
        (typeof window !== "undefined" ? window.crypto : null) ||
        (typeof global !== "undefined"
          ? ((global as Record<string, unknown>).crypto as Crypto)
          : null);

      if (cryptoObj && cryptoObj.randomUUID) {
        return `${prefix}-${cryptoObj.randomUUID().split("-")[0]}`;
      }

      if (cryptoObj && cryptoObj.getRandomValues) {
        const array = new Uint32Array(4);
        cryptoObj.getRandomValues(array);
        return `${prefix}-${array[0].toString(16)}-${array[1].toString(16)}`;
      }

      // SEC-015: Do NOT fall back to Math.random() — it is not cryptographically
      // secure and predictable peer IDs could enable targeted connection hijacking.
      throw new Error(
        "[PeerManager] Web Crypto API unavailable — cannot generate a secure peer ID. " +
          "This browser is not supported."
      );
    } catch (e) {
      // Re-throw explicitly so callers surface the error rather than silently using
      // an insecure ID. If the error came from our own throw above, propagate it.
      throw e instanceof Error ? e : new Error(String(e));
    }
  }

  constructor(private config: PeerConfig) {}

  /**
   * Initialize PeerJS connection to signaling server
   */
  initialize(peerId?: string, token?: string): Promise<string> {
    if (this.isDestroyed) return Promise.reject(new Error("PeerManager is destroyed"));
    if (this.initializationPromise) return this.initializationPromise;

    this.initializationPromise = new Promise((resolve, reject) => {
      try {
        // Typed PeerJS options — replaces `any` cast
        const options: {
          host: string;
          port: number;
          path: string;
          secure: boolean;
          debug: number;
          config?: RTCConfiguration;
          token?: string;
        } = {
          host: this.config.host,
          port: this.config.port,
          path: this.config.path,
          secure: this.config.secure ?? false,
          debug: this.config.debug ?? 0,
          config: this.config.config, // Use the provided RTCPeerConnection configuration
        };

        if (token) {
          options.token = token;
        }

        logger.debug(
          {
            ...options,
            config: {
              ...options.config,
              iceServers: options.config?.iceServers?.map((s: any) => ({
                ...s,
                credential: "***",
              })),
            },
          },
          "[PeerManager] Initializing with config"
        );

        this.config.onLog?.("[SYS] Initializing PeerManager...");
        this.config.onLog?.("[NET] Connecting to signaling server...");
        if (token) {
          this.config.onLog?.("[SEC] Authenticating with signaling server using JWT...");
        }

        const finalId = peerId || PeerManager.getRandomId();
        this.peer = new Peer(finalId, options);

        this.peer.on("open", (id) => {
          if (this.isDestroyed) {
            this.peer?.destroy();
            return;
          }
          this.connectionState = "connected";

          // If this was a reconnection, emit reconnected event
          if (this.isReconnecting) {
            this.isReconnecting = false;
            this.reconnectAttempts = 0;
            logger.debug({ peerId: id }, "[PeerManager] Reconnected to signaling server");
            this.config.onLog?.("[NET] Reconnected to signaling server.");
            this.emit("reconnected", id);
          } else {
            if (token) {
              this.config.onLog?.("[SEC] Authenticated with signaling server (JWT verified).");
            }
            this.config.onLog?.(`[SYS] PeerManager initialized with ID: ${id}`);
          }

          this.emit("state-change", "connected");
          resolve(id);
        });

        this.peer.on("error", (error) => {
          this.connectionState = "failed";
          this.emit("state-change", "failed");
          this.emit("error", error);
          // AUDIT FIX: Reset initializationPromise on error so re-initialization is possible
          this.initializationPromise = null;
          reject(error);
        });

        this.peer.on("connection", (conn) => {
          logger.debug({ peerId: conn.peer }, "[PeerManager] Incoming connection");
          this.handleIncomingConnection(conn);
        });

        this.peer.on("disconnected", () => {
          this.connectionState = "disconnected";
          this.emit("state-change", "disconnected");
          // Auto-reconnect if not intentionally destroyed
          if (!this.isDestroyed) {
            this.attemptReconnect();
          }
        });

        this.peer.on("close", () => {
          this.connectionState = "closed";
          this.emit("state-change", "closed");
        });
      } catch (error) {
        // AUDIT FIX: Reset initializationPromise on error so re-initialization is possible
        this.initializationPromise = null;
        reject(error);
      }
    });

    return this.initializationPromise;
  }

  /**
   * Attempt to reconnect to signaling server with exponential backoff
   */
  private attemptReconnect(): void {
    if (this.isDestroyed || !this.peer || this.peer.destroyed) return;
    if (this.reconnectAttempts >= PeerManager.MAX_RECONNECT_ATTEMPTS) {
      logger.error(
        { attempts: this.reconnectAttempts },
        "[PeerManager] Max reconnection attempts reached"
      );
      this.config.onLog?.("[ERR] [NET] Max reconnection attempts reached. Offline.");
      this.emit("reconnect-failed");
      return;
    }

    this.isReconnecting = true;
    this.reconnectAttempts++;

    // Exponential backoff with jitter: 1s, 2s, 4s, 8s... capped at 30s
    const delay = Math.min(
      PeerManager.BASE_DELAY_MS * Math.pow(2, this.reconnectAttempts - 1) + Math.random() * 500,
      PeerManager.MAX_DELAY_MS
    );

    logger.debug(
      { attempt: this.reconnectAttempts, delayMs: Math.round(delay) },
      "[PeerManager] Scheduling reconnection"
    );
    if (this.reconnectAttempts === 1) {
      this.config.onLog?.(
        `[WARN] [NET] Signaling server disconnected. Scheduling reconnection in ${Math.round(delay)}ms...`
      );
    } else {
      this.config.onLog?.(
        `[NET] Reconnecting to signaling server (Attempt ${this.reconnectAttempts}/${PeerManager.MAX_RECONNECT_ATTEMPTS})...`
      );
    }
    this.emit("reconnecting", {
      attempt: this.reconnectAttempts,
      maxAttempts: PeerManager.MAX_RECONNECT_ATTEMPTS,
    });

    this.reconnectTimer = setTimeout(() => {
      if (this.isDestroyed || !this.peer || this.peer.destroyed) return;
      logger.debug({ attempt: this.reconnectAttempts }, "[PeerManager] Attempting reconnection...");
      this.peer.reconnect();
    }, delay);
  }

  /**
   * Connect to a remote peer
   */
  connectToPeer(remotePeerId: string): DataConnection {
    if (!this.peer) {
      throw new Error("Peer not initialized");
    }

    logger.debug({ remotePeerId }, "[PeerManager] connectToPeer");
    this.config.onLog?.(`[NET] Initiating connection to remote peer: ${remotePeerId}`);
    const conn = this.peer.connect(remotePeerId, {
      reliable: true,
      serialization: "binary",
    });

    this.handleConnection(conn);
    return conn;
  }

  /**
   * Handle incoming peer connections
   */
  private handleIncomingConnection(conn: DataConnection) {
    logger.debug({ peerId: conn.peer }, "[PeerManager] handleIncomingConnection");
    this.config.onLog?.(`[NET] Incoming connection from peer: ${conn.peer}`);
    this.handleConnection(conn);
    this.emit("incoming-connection", conn);
  }

  /**
   * Setup connection event handlers
   */
  private handleConnection(conn: DataConnection) {
    this.connections.set(conn.peer, conn);

    conn.on("open", () => {
      this.config.onLog?.("[RTC] reliable-channel open (SCTP maxRetransmits: 0)");
      this.emit("connection-open", conn);
    });

    conn.on("data", (data) => {
      this.emit("data", { connection: conn, data });
    });

    conn.on("close", () => {
      this.connections.delete(conn.peer);
      this.emit("connection-close", conn);
    });

    conn.on("error", (error) => {
      this.emit("connection-error", { connection: conn, error });
    });

    // Monitor ICE connection state for debugging
    // PeerJS internally exposes the underlying RTCPeerConnection as .peerConnection.
    // Using a local type alias avoids a raw `as any`.
    type PeerJSDataConnectionInternal = { peerConnection?: RTCPeerConnection };
    const pc = (conn as unknown as PeerJSDataConnectionInternal).peerConnection;
    if (pc) {
      pc.addEventListener("icecandidate", (event: RTCPeerConnectionIceEvent) => {
        if (event.candidate) {
          this.lastIceCandidates.push(event.candidate); // Task #4: Store for diagnostics
          const type = event.candidate.type; // 'host', 'srflx' (STUN), or 'relay' (TURN)
          const protocol = event.candidate.protocol;
          // .address is the standard property; .ip is the legacy alias declared in global.d.ts
          const address = event.candidate.address ?? event.candidate.ip;
          const safeAddress = process.env.NODE_ENV === "production" ? "[REDACTED]" : address;
          logger.debug({ type, protocol, address: safeAddress }, "[ICE] Candidate gathered");
          this.config.onLog?.(
            `[ICE] Candidate gathered: ${type} (${protocol}) from ${safeAddress}`
          );
          if (type === "relay") {
            this.config.onLog?.("[ICE] Relay server (TURN) allocated.");
          }
        } else {
          logger.debug("[ICE] All local candidates gathered");
          this.config.onLog?.("[ICE] All local candidates gathered.");
        }
      });

      // Monitor signaling state
      pc.addEventListener("signalingstatechange", () => {
        logger.debug({ state: pc.signalingState }, "[WEBRTC] Signaling state changed");
        this.config.onLog?.(`[WEBRTC] Signaling state changed: ${pc.signalingState}`);
      });

      // Monitor ICE connection state changes
      pc.addEventListener("iceconnectionstatechange", () => {
        const state = pc.iceConnectionState;
        logger.debug({ state }, "[ICE] Connection state changed");
        this.config.onLog?.(`[ICE] State changed to '${state}'`);

        if (state === "failed") {
          // Task #4: Determine if firewall is blocking connection
          // If we only have 'host' candidates, it means STUN/TURN failed or was blocked.
          const hasRemoteCandidates = this.lastIceCandidates.some((c) => c.type !== "host");
          if (!hasRemoteCandidates && this.lastIceCandidates.length > 0) {
            logger.error("[ICE] Firewall Blocked: Only host candidates gathered. P2P unlikely.");
            this.config.onLog?.(
              "[ERR] [ICE] Firewall Blocked: Only host candidates gathered. P2P unlikely."
            );
            this.emit("firewall-blocked");
          }

          logger.error(
            {
              iceGatheringState: pc.iceGatheringState,
              candidateCount: this.lastIceCandidates.length,
              signalingState: pc.signalingState,
              localDescription: pc.localDescription?.type,
              remoteDescription: pc.remoteDescription?.type,
              isSecureContext: typeof window !== "undefined" ? window.isSecureContext : "unknown",
            },
            "[ICE] Connection failed - diagnostics"
          );
        } else if (state === "connected" || state === "completed") {
          // Log the selected candidate pair to see if TURN was used
          pc.getStats(null)
            .then((stats: RTCStatsReport) => {
              stats.forEach((report: RTCStats) => {
                if (report.type === "candidate-pair") {
                  const pair = report as RTCIceCandidatePairStats;
                  if (pair.state === "succeeded") {
                    logger.debug(
                      {
                        local: pair.localCandidateId,
                        remote: pair.remoteCandidateId,
                      },
                      "[ICE] Connected using candidate pair"
                    );
                    this.config.onLog?.(
                      `[ICE] Connected using candidate pair: ${pair.localCandidateId} -> ${pair.remoteCandidateId}`
                    );
                  }
                }
              });
            })
            .catch((e: unknown) => logger.error({ e }, "[ICE] getStats failed"));
        }
      });

      // Monitor gathering state
      pc.addEventListener("icegatheringstatechange", () => {
        logger.debug({ state: pc.iceGatheringState }, "[ICE] Gathering state changed");
      });
    }
  }

  /**
   * Get current peer ID
   */
  getPeerId(): string | null {
    return this.peer?.id ?? null;
  }

  /**
   * Get connection state
   */
  getState(): ConnectionState {
    return this.connectionState;
  }

  /**
   * Get active connection by peer ID
   */
  getConnection(peerId: string): DataConnection | undefined {
    return this.connections.get(peerId);
  }

  /**
   * Get all active connections
   */
  getConnections(): DataConnection[] {
    return Array.from(this.connections.values());
  }

  /**
   * Close specific connection
   */
  closeConnection(peerId: string): void {
    const conn = this.connections.get(peerId);
    if (conn) {
      conn.close();
      this.connections.delete(peerId);
    }
  }

  /**
   * Event listener management
   */
  on(event: string, callback: (...args: unknown[]) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);
  }

  off(event: string, callback: (...args: unknown[]) => void): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  private emit(event: string, data?: unknown): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach((callback) => callback(data));
    }
  }

  /**
   * Destroy peer connection and cleanup
   */
  destroy(): void {
    this.isDestroyed = true;
    this.initializationPromise = null;
    // Clear any pending reconnection timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.isReconnecting = false;
    this.reconnectAttempts = 0;
    this.connections.forEach((conn) => conn.close());
    this.connections.clear();
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
    this.connectionState = "closed";
    this.eventListeners.clear();
  }
}
