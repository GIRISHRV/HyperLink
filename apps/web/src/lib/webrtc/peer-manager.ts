import Peer, { type DataConnection } from "peerjs";
import type { PeerConfig, ConnectionState } from "@repo/types";

export class PeerManager {
  private peer: Peer | null = null;
  private connections: Map<string, DataConnection> = new Map();
  private connectionState: ConnectionState = "disconnected";
  private eventListeners: Map<string, Set<Function>> = new Map();

  constructor(private config: PeerConfig) { }

  /**
   * Initialize PeerJS connection to signaling server
   */
  async initialize(peerId?: string): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        const options = {
          host: this.config.host,
          port: this.config.port,
          path: this.config.path,
          secure: this.config.secure ?? false,
          debug: this.config.debug ?? 0,
        };

        if (peerId) {
          this.peer = new Peer(peerId, options);
        } else {
          this.peer = new Peer(options);
        }

        this.peer.on("open", (id) => {
          this.connectionState = "connected";
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
        });

        this.peer.on("close", () => {
          this.connectionState = "closed";
          this.emit("state-change", "closed");
        });
      } catch (error) {
        reject(error);
      }
    });
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
  on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);
  }

  off(event: string, callback: Function): void {
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
    this.connections.forEach((conn) => conn.close());
    this.connections.clear();
    this.peer?.destroy();
    this.peer = null;
    this.connectionState = "closed";
    this.eventListeners.clear();
  }
}
