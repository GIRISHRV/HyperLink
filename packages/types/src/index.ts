/**
 * Transfer status lifecycle
 */
export type TransferStatus =
  | "pending"
  | "connecting"
  | "transferring"
  | "paused"
  | "complete"
  | "failed"
  | "cancelled";

/**
 * Transfer metadata stored in Supabase
 */
export interface Transfer {
  id: string;
  filename: string;
  file_size: number;
  sender_id: string;
  receiver_id: string | null;
  status: TransferStatus;
  created_at: string;
  completed_at: string | null;
}

/**
 * File chunk schema for IndexedDB storage
 */
export interface FileChunk {
  transferId: string;
  chunkIndex: number;
  data: Blob;
  timestamp: number;
}

/**
 * PeerJS configuration
 */
export interface PeerConfig {
  host: string;
  port: number;
  path: string;
  secure?: boolean;
  debug?: number;
  config?: any; // RTCConfiguration
}

/**
 * Transfer progress event
 */
export interface TransferProgress {
  transferId: string;
  bytesTransferred: number;
  totalBytes: number;
  percentage: number;
  speed: number; // bytes per second
  timeRemaining: number; // seconds
}

/**
 * WebRTC connection state
 */
export type ConnectionState = "disconnected" | "connecting" | "connected" | "failed" | "closed";

/**
 * Peer message types
 */
export type PeerMessageType =
  | "file-offer"
  | "file-accept"
  | "file-reject"
  | "chunk"
  | "chunk-ack"
  | "transfer-complete"
  | "transfer-error"
  | "transfer-cancel"
  | "transfer-pause"
  | "transfer-resume"
  | "receiver-busy"
  | "chat-message";

/**
 * Chat message payload
 */
export interface ChatMessage {
  id: string;
  senderId: string;
  text: string;
  timestamp: number;
  isSystem?: boolean;
}

/**
 * Peer message structure
 */
export interface PeerMessage<T = unknown> {
  type: PeerMessageType;
  transferId: string;
  payload: T;
  timestamp: number;
}

/**
 * File offer payload
 */
export interface FileOfferPayload {
  filename: string;
  fileSize: number;
  fileType: string;
  totalChunks: number;
  /** The Supabase DB transfer ID so the receiver can reference the same record */
  dbTransferId?: string;

  /** Multi-file Batch Metadata */
  batchId?: string;      // Unique ID for the group
  batchSize?: number;    // Total number of files
  batchIndex?: number;   // Current file index (0-based)
  totalBatchSize?: number; // Total bytes of all files (optional)

  /** End-to-End Encryption */
  isEncrypted?: boolean; // True if file is password protected
  salt?: string;         // Base64 encoded salt for PBKDF2
}

/**
 * Chunk data payload
 */
export interface ChunkPayload {
  chunkIndex: number;
  data: ArrayBuffer;
}

