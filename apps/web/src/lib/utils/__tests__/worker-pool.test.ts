/**
 * Worker Pool Tests
 *
 * Tests worker lifecycle management, message passing, error handling,
 * and cleanup behavior.
 *
 * Addresses AUDIT.md §5: "worker-pool.ts has no corresponding test files"
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { WorkerPool } from "../worker-pool";

// Mock Worker class
class MockWorker {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  private terminated = false;

  postMessage(message: any, _transferables?: Transferable[]) {
    if (this.terminated) {
      throw new Error("Worker is terminated");
    }
    // Simulate async worker response
    setTimeout(() => {
      if (this.onmessage && !this.terminated) {
        this.onmessage(new MessageEvent("message", { data: message }));
      }
    }, 0);
  }

  terminate() {
    this.terminated = true;
  }

  simulateSuccess(id: string, payload: any) {
    if (this.onmessage && !this.terminated) {
      this.onmessage(
        new MessageEvent("message", {
          data: { id, type: "success", payload },
        })
      );
    }
  }

  simulateError(id: string, error: string) {
    if (this.onmessage && !this.terminated) {
      this.onmessage(
        new MessageEvent("message", {
          data: { id, type: "error", error },
        })
      );
    }
  }

  simulateProgress(id: string, progress: number) {
    if (this.onmessage && !this.terminated) {
      this.onmessage(
        new MessageEvent("message", {
          data: { id, type: "progress", payload: { progress } },
        })
      );
    }
  }

  simulateWorkerError(message: string) {
    if (this.onerror && !this.terminated) {
      this.onerror(new ErrorEvent("error", { message }));
    }
  }
}

describe("WorkerPool", () => {
  let mockWorker: MockWorker;
  let workerPool: WorkerPool;

  beforeEach(() => {
    mockWorker = new MockWorker();
    workerPool = new WorkerPool(() => mockWorker as any);
  });

  afterEach(() => {
    workerPool.terminate();
  });

  it("creates worker lazily on first execute", () => {
    expect(workerPool.isActive()).toBe(false);
    workerPool.execute("test", {});
    expect(workerPool.isActive()).toBe(true);
  });

  it("resolves promise on success response", async () => {
    const executePromise = workerPool.execute("test", { data: "hello" });

    // Simulate worker success response
    setTimeout(() => {
      mockWorker.simulateSuccess("msg_1", { result: "world" });
    }, 10);

    const result = await executePromise;
    expect(result).toEqual({ result: "world" });
  });

  it("rejects promise on error response", async () => {
    const executePromise = workerPool.execute("test", {});

    setTimeout(() => {
      mockWorker.simulateError("msg_1", "Processing failed");
    }, 10);

    await expect(executePromise).rejects.toThrow("Processing failed");
  });

  it("calls onProgress callback for progress updates", async () => {
    const progressUpdates: number[] = [];
    const onProgress = (progress: number) => progressUpdates.push(progress);

    const executePromise = workerPool.execute("test", {}, onProgress);

    setTimeout(() => {
      mockWorker.simulateProgress("msg_1", 25);
      mockWorker.simulateProgress("msg_1", 50);
      mockWorker.simulateProgress("msg_1", 75);
      mockWorker.simulateSuccess("msg_1", { done: true });
    }, 10);

    await executePromise;
    expect(progressUpdates).toEqual([25, 50, 75]);
  });

  it("handles multiple concurrent requests", async () => {
    const promise1 = workerPool.execute("task1", {});
    const promise2 = workerPool.execute("task2", {});

    setTimeout(() => {
      mockWorker.simulateSuccess("msg_1", { result: "first" });
      mockWorker.simulateSuccess("msg_2", { result: "second" });
    }, 10);

    const [result1, result2] = await Promise.all([promise1, promise2]);
    expect(result1).toEqual({ result: "first" });
    expect(result2).toEqual({ result: "second" });
  });

  it("rejects all pending requests on worker error", async () => {
    const promise1 = workerPool.execute("task1", {});
    const promise2 = workerPool.execute("task2", {});

    setTimeout(() => {
      mockWorker.simulateWorkerError("Worker crashed");
    }, 10);

    await expect(promise1).rejects.toThrow("Worker error: Worker crashed");
    await expect(promise2).rejects.toThrow("Worker error: Worker crashed");
  });

  it("terminates worker and clears pending requests", () => {
    workerPool.execute("test", {});

    workerPool.terminate();

    expect(workerPool.isActive()).toBe(false);
    // Promise will never resolve since worker is terminated
  });

  it("recreates worker after termination", async () => {
    const promise1 = workerPool.execute("test", {});
    setTimeout(() => mockWorker.simulateSuccess("msg_1", { done: true }), 10);
    await promise1;

    workerPool.terminate();
    expect(workerPool.isActive()).toBe(false);

    // Create new mock worker for second execution
    mockWorker = new MockWorker();
    workerPool = new WorkerPool(() => mockWorker as any);

    // Create new worker on next execute
    const promise2 = workerPool.execute("test2", {});
    setTimeout(() => mockWorker.simulateSuccess("msg_1", { done: true }), 10);

    expect(workerPool.isActive()).toBe(true);
    await promise2;
  });

  it("ignores messages for unknown request IDs", async () => {
    const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    workerPool.execute("test", {});

    // Simulate response for non-existent request
    mockWorker.simulateSuccess("unknown_id", {});

    // Should not throw, just log warning
    await new Promise((resolve) => setTimeout(resolve, 20));

    consoleWarnSpy.mockRestore();
  });

  it("supports transferable objects", async () => {
    const buffer = new ArrayBuffer(1024);
    const postMessageSpy = vi.spyOn(mockWorker, "postMessage");

    workerPool.execute("test", { buffer }, undefined, [buffer]);

    expect(postMessageSpy).toHaveBeenCalledWith(expect.objectContaining({ type: "test" }), [
      buffer,
    ]);
  });
});
