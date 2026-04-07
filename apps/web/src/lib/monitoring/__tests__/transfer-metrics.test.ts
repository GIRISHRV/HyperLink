/**
 * Transfer Metrics Tests
 *
 * Tests the transfer performance monitoring system including metric collection,
 * milestone tracking, cleanup, and performance analysis.
 *
 * Addresses AUDIT.md §9: "transfer-metrics.ts has zero test coverage"
 */
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { transferMetrics, type ConnectionQuality } from "../transfer-metrics";

describe("TransferMetricsCollector", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts tracking a new transfer", () => {
    transferMetrics.startTransfer("test-1", 1024 * 1024);

    const metrics = transferMetrics.getMetrics("test-1");
    expect(metrics).toBeDefined();
    expect(metrics?.fileSize).toBe(1024 * 1024);
    expect(metrics?.bytesTransferred).toBe(0);
    expect(metrics?.chunkCount).toBe(0);
  });

  it("updates progress and calculates average chunk size", () => {
    transferMetrics.startTransfer("test-2", 1000);

    transferMetrics.updateProgress("test-2", 100, 100);
    transferMetrics.updateProgress("test-2", 300, 200);
    transferMetrics.updateProgress("test-2", 600, 300);

    const metrics = transferMetrics.getMetrics("test-2");
    expect(metrics?.bytesTransferred).toBe(600);
    expect(metrics?.chunkCount).toBe(3);
    expect(metrics?.averageChunkSize).toBe(200); // (100 + 200 + 300) / 3
  });

  it("records connection quality", () => {
    transferMetrics.startTransfer("test-3", 1000);

    const quality: ConnectionQuality = {
      rtt: 50,
      packetLoss: 0.01,
      jitter: 5,
      bandwidth: 1000000,
      connectionType: "direct",
    };

    transferMetrics.recordConnectionQuality("test-3", quality);

    const metrics = transferMetrics.getMetrics("test-3");
    expect(metrics?.connectionType).toBe("direct");
    expect(metrics?.networkLatency).toBe(50);
  });

  it("records errors and increments error count", () => {
    transferMetrics.startTransfer("test-4", 1000);

    transferMetrics.recordError("test-4", "Connection timeout");
    transferMetrics.recordError("test-4", "Chunk verification failed");

    const metrics = transferMetrics.getMetrics("test-4");
    expect(metrics?.errorCount).toBe(2);
  });

  it("records pause and resume events", () => {
    transferMetrics.startTransfer("test-5", 1000);

    transferMetrics.recordPause("test-5");
    transferMetrics.recordResume("test-5");
    transferMetrics.recordPause("test-5");

    const metrics = transferMetrics.getMetrics("test-5");
    expect(metrics?.pauseCount).toBe(2);
    expect(metrics?.resumeCount).toBe(1);
  });

  it("completes transfer and calculates final speed", () => {
    const startTime = Date.now();
    vi.setSystemTime(startTime);

    transferMetrics.startTransfer("test-6", 1000);
    transferMetrics.updateProgress("test-6", 1000, 1000);

    // Advance time by 1 second
    vi.advanceTimersByTime(1000);

    transferMetrics.completeTransfer("test-6", true);

    // Metrics should be cleaned up after completion
    expect(transferMetrics.getMetrics("test-6")).toBeUndefined();
  });

  it("logs milestones at 25%, 50%, 75%", () => {
    transferMetrics.startTransfer("test-7", 1000);

    // Progress to 25%
    transferMetrics.updateProgress("test-7", 250, 250);
    let metrics = transferMetrics.getMetrics("test-7");
    expect(metrics?.bytesTransferred).toBe(250);

    // Progress to 50%
    transferMetrics.updateProgress("test-7", 500, 250);
    metrics = transferMetrics.getMetrics("test-7");
    expect(metrics?.bytesTransferred).toBe(500);

    // Progress to 75%
    transferMetrics.updateProgress("test-7", 750, 250);
    metrics = transferMetrics.getMetrics("test-7");
    expect(metrics?.bytesTransferred).toBe(750);
    expect(metrics?.chunkCount).toBe(3);
  });

  it("only logs each milestone once", () => {
    transferMetrics.startTransfer("test-8", 1000);

    // Progress past 25% multiple times
    transferMetrics.updateProgress("test-8", 250, 250);
    transferMetrics.updateProgress("test-8", 260, 10);
    transferMetrics.updateProgress("test-8", 270, 10);

    const metrics = transferMetrics.getMetrics("test-8");
    expect(metrics?.bytesTransferred).toBe(270);
    expect(metrics?.chunkCount).toBe(3);
  });

  it("cleans up stale metrics after 24 hours", () => {
    const startTime = Date.now();
    vi.setSystemTime(startTime);

    transferMetrics.startTransfer("stale-1", 1000);

    // Advance time by 25 hours
    vi.advanceTimersByTime(25 * 60 * 60 * 1000);

    // Start a new transfer which triggers cleanup
    transferMetrics.startTransfer("fresh-1", 2000);

    // Stale transfer should be cleaned up
    expect(transferMetrics.getMetrics("stale-1")).toBeUndefined();
    expect(transferMetrics.getMetrics("fresh-1")).toBeDefined();
  });

  it("enforces max entries limit", () => {
    // Create 101 transfers (over the limit of 100)
    for (let i = 0; i < 101; i++) {
      vi.advanceTimersByTime(1000); // Advance time to make them different ages
      transferMetrics.startTransfer(`transfer-${i}`, 1000);
    }

    // The oldest transfer should be removed
    expect(transferMetrics.getMetrics("transfer-0")).toBeUndefined();
    expect(transferMetrics.getMetrics("transfer-100")).toBeDefined();
  });

  it("handles updates for non-existent transfer gracefully", () => {
    // Should not throw
    expect(() => {
      transferMetrics.updateProgress("non-existent", 100, 100);
      transferMetrics.recordError("non-existent", "error");
      transferMetrics.recordPause("non-existent");
      transferMetrics.recordResume("non-existent");
    }).not.toThrow();
  });

  it("calculates performance metrics correctly", () => {
    const startTime = Date.now();
    vi.setSystemTime(startTime);

    transferMetrics.startTransfer("perf-1", 10 * 1024 * 1024); // 10 MB

    const quality: ConnectionQuality = {
      rtt: 30,
      packetLoss: 0,
      jitter: 2,
      bandwidth: 100000000,
      connectionType: "direct",
    };

    transferMetrics.recordConnectionQuality("perf-1", quality);
    transferMetrics.updateProgress("perf-1", 10 * 1024 * 1024, 65536);

    // Advance time by 1 second
    vi.advanceTimersByTime(1000);

    transferMetrics.completeTransfer("perf-1", true);

    // Metrics should be cleaned up
    expect(transferMetrics.getMetrics("perf-1")).toBeUndefined();
  });
});
