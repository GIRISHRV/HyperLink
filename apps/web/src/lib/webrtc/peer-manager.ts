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

  // Reconnection state
  private static readonly MAX_RECONNECT_ATTEMPTS = 5;
  private static readonly BASE_DELAY_MS = 1000;
  private static readonly MAX_DELAY_MS = 30000;
  private reconnectAttempts: number = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private isReconnecting: boolean = false;

  constructor(private config: PeerConfig) { }

  /**
   * Initialize PeerJS connection to signaling server
   */
  initialize(peerId?: string): Promise<string> {
    if (this.isDestroyed) return Promise.reject(new Error("PeerManager is destroyed"));
    if (this.initializationPromise) return this.initializationPromise;

    this.initializationPromise = new Promise((resolve, reject) => {
      try {
        const options = {
          host: this.config.host,
          port: this.config.port,
          path: this.config.path,
          secure: this.config.secure ?? false,
          debug: this.config.debug ?? 0,
          config: this.config.config, // Use the provided RTCPeerConnection configuration
        };

        logger.info({
          ...options,
          config: {
            ...options.config,
            iceServers: options.config?.iceServers?.map((s) => ({ ...s, credential: '***' }))
          }
        }, "[PeerManager] Initializing with config");

        if (peerId) {
          this.peer = new Peer(peerId, options);
        } else {
          this.peer = new Peer(options);
        }

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
            logger.info({ peerId: id }, "[PeerManager] Reconnected to signaling server");
            this.emit("reconnected", id);
          }

          this.emit("state-change", "connected");
          resolve(id);
        });

        this.peer.on("error", (error) => {
          this.connectionState = "failed";
          this.emit("state-change", "failed");
          this.emit("error", error);
          reject(error);
        });

        this.peer.on("connection", (conn) => {
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
      logger.error({ attempts: this.reconnectAttempts }, "[PeerManager] Max reconnection attempts reached");
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

    logger.info({ attempt: this.reconnectAttempts, delayMs: Math.round(delay) }, "[PeerManager] Scheduling reconnection");
    this.emit("reconnecting", { attempt: this.reconnectAttempts, maxAttempts: PeerManager.MAX_RECONNECT_ATTEMPTS });

    this.reconnectTimer = setTimeout(() => {
      if (this.isDestroyed || !this.peer || this.peer.destroyed) return;
      logger.info({ attempt: this.reconnectAttempts }, "[PeerManager] Attempting reconnection...");
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
    this.handleConnection(conn);
    this.emit("incoming-connection", conn);
  }

  /**
   * Setup connection event handlers
   */
  private handleConnection(conn: DataConnection) {
    this.connections.set(conn.peer, conn);

    conn.on("open", () => {
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
          const type = event.candidate.type; // 'host', 'srflx' (STUN), or 'relay' (TURN)
          const protocol = event.candidate.protocol;
          // .address is the standard property; .ip is the legacy alias declared in global.d.ts
          const address = event.candidate.address ?? event.candidate.ip;
          const safeAddress = process.env.NODE_ENV === 'production' ? '[REDACTED]' : address;
          logger.info({ type, protocol, address: safeAddress }, "[ICE] Candidate gathered");
        } else {
          logger.info("[ICE] All local candidates gathered");
        }
      });

      // Monitor signaling state
      pc.addEventListener("signalingstatechange", () => {
        logger.info({ state: pc.signalingState }, "[WEBRTC] Signaling state changed");
      });

      // Monitor ICE connection state changes
      pc.addEventListener("iceconnectionstatechange", () => {
        const state = pc.iceConnectionState;
        logger.info({ state }, "[ICE] Connection state changed");

        if (state === "failed") {
          logger.error({
            iceGatheringState: pc.iceGatheringState,
            signalingState: pc.signalingState,
            localDescription: pc.localDescription?.type,
            remoteDescription: pc.remoteDescription?.type,
            isSecureContext: typeof window !== 'undefined' ? window.isSecureContext : 'unknown'
          }, "[ICE] Connection failed - diagnostics");
        } else if (state === "connected" || state === "completed") {
          // Log the selected candidate pair to see if TURN was used
          pc.getStats(null).then((stats: RTCStatsReport) => {
            stats.forEach((report: any) => {
              if (report.type === "candidate-pair" && report.state === "succeeded") {
                logger.info({
                  local: report.localCandidateId,
                  remote: report.remoteCandidateId,
                  report
                }, "[ICE] Connected using candidate pair");
              }
            });
          });
        }
      });

      // Monitor gathering state
      pc.addEventListener("icegatheringstatechange", () => {
        logger.info({ state: pc.iceGatheringState }, "[ICE] Gathering state changed");
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
