/**
 * Worker Pool Manager
 *
 * Manages lifecycle and message passing for Web Workers.
 * Provides a promise-based API for worker communication.
 */

import { logger } from "@repo/utils";

type WorkerMessage = {
  id: string;
  type: string;
  payload?: any;
};

type WorkerResponse = {
  id: string;
  type: "success" | "error" | "progress";
  payload?: any;
  error?: string;
};

type PendingRequest = {
  resolve: (value: any) => void;
  reject: (error: Error) => void;
  onProgress?: (progress: number) => void;
};

export class WorkerPool {
  private worker: Worker | null = null;
  private pendingRequests = new Map<string, PendingRequest>();
  private messageIdCounter = 0;

  constructor(private workerFactory: () => Worker) {}

  /**
   * Initialize the worker
   */
  private ensureWorker(): Worker {
    if (!this.worker) {
      this.worker = this.workerFactory();
      this.worker.onmessage = this.handleMessage.bind(this);
      this.worker.onerror = this.handleError.bind(this);
    }
    return this.worker;
  }

  /**
   * Handle messages from worker
   */
  private handleMessage(event: MessageEvent<WorkerResponse>) {
    const { id, type, payload, error } = event.data;
    const pending = this.pendingRequests.get(id);

    if (!pending) {
      logger.warn({ id }, "[WorkerPool] Received message for unknown request");
      return;
    }

    switch (type) {
      case "success":
        this.pendingRequests.delete(id);
        pending.resolve(payload);
        break;

      case "error":
        this.pendingRequests.delete(id);
        pending.reject(new Error(error || "Worker error"));
        break;

      case "progress":
        if (pending.onProgress && payload?.progress !== undefined) {
          pending.onProgress(payload.progress);
        }
        break;

      default:
        logger.warn({ type }, "[WorkerPool] Unknown response type");
    }
  }

  /**
   * Handle worker errors
   */
  private handleError(error: ErrorEvent) {
    logger.error({ error }, "[WorkerPool] Worker error");

    // Reject all pending requests
    for (const [id, pending] of this.pendingRequests.entries()) {
      pending.reject(new Error(`Worker error: ${error.message}`));
      this.pendingRequests.delete(id);
    }

    // Terminate and recreate worker
    this.terminate();
  }

  /**
   * Send a message to the worker and wait for response
   */
  async execute<T = any>(
    type: string,
    payload?: any,
    onProgress?: (progress: number) => void,
    transferables?: Transferable[]
  ): Promise<T> {
    const worker = this.ensureWorker();
    const id = `msg_${++this.messageIdCounter}`;

    return new Promise<T>((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject, onProgress });

      const message: WorkerMessage = { id, type, payload };

      if (transferables && transferables.length > 0) {
        worker.postMessage(message, transferables);
      } else {
        worker.postMessage(message);
      }
    });
  }

  /**
   * Terminate the worker and clean up
   */
  terminate() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.pendingRequests.clear();
  }

  /**
   * Check if worker is active
   */
  isActive(): boolean {
    return this.worker !== null;
  }
}
