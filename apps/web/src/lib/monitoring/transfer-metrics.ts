/**
 * Transfer Performance Monitoring
 *
 * Tracks detailed metrics for P2P transfers to identify bottlenecks
 * and optimize performance. Integrates with existing logger.
 */

import { logger } from "@repo/utils";

export interface TransferMetrics {
  transferId: string;
  fileSize: number;
  startTime: number;
  endTime?: number;
  bytesTransferred: number;
  chunkCount: number;
  averageChunkSize: number;
  connectionType: "direct" | "relay" | "unknown";
  networkLatency?: number;
  errorCount: number;
  pauseCount: number;
  resumeCount: number;
  finalSpeed?: number; // bytes per second
}

export interface ConnectionQuality {
  rtt: number;
  packetLoss: number;
  jitter: number;
  bandwidth: number;
  connectionType: "direct" | "relay" | "unknown";
}

class TransferMetricsCollector {
  private metrics = new Map<string, TransferMetrics>();
  private connectionQualities = new Map<string, ConnectionQuality[]>();
  private readonly MAX_STALE_TIME = 24 * 60 * 60 * 1000; // 24 hours
  private readonly MAX_ENTRIES = 100;

  /**
   * Start tracking a new transfer
   */
  startTransfer(transferId: string, fileSize: number): void {
    // Cleanup stale entries before adding new one
    this.cleanupStaleMetrics();
    this.metrics.set(transferId, {
      transferId,
      fileSize,
      startTime: Date.now(),
      bytesTransferred: 0,
      chunkCount: 0,
      averageChunkSize: 0,
      connectionType: "unknown",
      errorCount: 0,
      pauseCount: 0,
      resumeCount: 0,
    });

    logger.info(
      { transferId, fileSize, fileSizeMB: (fileSize / 1024 / 1024).toFixed(2) },
      "transfer_started"
    );
  }

  /**
   * Update transfer progress
   */
  updateProgress(transferId: string, bytesTransferred: number, chunkSize: number): void {
    const metrics = this.metrics.get(transferId);
    if (!metrics) return;

    metrics.bytesTransferred = bytesTransferred;
    metrics.chunkCount++;

    // Calculate running average chunk size
    metrics.averageChunkSize =
      (metrics.averageChunkSize * (metrics.chunkCount - 1) + chunkSize) / metrics.chunkCount;

    // Log progress milestones using last-logged tracker
    const progress = (bytesTransferred / metrics.fileSize) * 100;
    this.checkAndLogMilestone(transferId, progress);
  }

  /**
   * Check and log milestone if threshold crossed
   */
  private lastLoggedMilestone = new Map<string, number>();

  private checkAndLogMilestone(transferId: string, progress: number): void {
    const lastLogged = this.lastLoggedMilestone.get(transferId) || 0;

    // Check for 25%, 50%, 75% milestones
    const milestones = [25, 50, 75];
    for (const milestone of milestones) {
      if (progress >= milestone && lastLogged < milestone) {
        this.logMilestone(transferId, milestone);
        this.lastLoggedMilestone.set(transferId, milestone);
        break; // Only log one milestone per update
      }
    }
  }

  /**
   * Record connection quality metrics
   */
  recordConnectionQuality(transferId: string, quality: ConnectionQuality): void {
    if (!this.connectionQualities.has(transferId)) {
      this.connectionQualities.set(transferId, []);
    }

    this.connectionQualities.get(transferId)!.push(quality);

    const metrics = this.metrics.get(transferId);
    if (metrics) {
      metrics.connectionType = quality.connectionType;
      metrics.networkLatency = quality.rtt;
    }
  }

  /**
   * Record transfer error
   */
  recordError(transferId: string, error: string): void {
    const metrics = this.metrics.get(transferId);
    if (!metrics) return;

    metrics.errorCount++;

    logger.warn(
      {
        transferId,
        error,
        errorCount: metrics.errorCount,
        progress: (metrics.bytesTransferred / metrics.fileSize) * 100,
      },
      "transfer_error"
    );
  }

  /**
   * Record pause/resume events
   */
  recordPause(transferId: string): void {
    const metrics = this.metrics.get(transferId);
    if (metrics) {
      metrics.pauseCount++;
    }
  }

  recordResume(transferId: string): void {
    const metrics = this.metrics.get(transferId);
    if (metrics) {
      metrics.resumeCount++;
    }
  }

  /**
   * Complete transfer and log final metrics
   */
  completeTransfer(transferId: string, success: boolean): void {
    const metrics = this.metrics.get(transferId);
    if (!metrics) return;

    metrics.endTime = Date.now();
    const duration = metrics.endTime - metrics.startTime;
    metrics.finalSpeed = metrics.bytesTransferred / (duration / 1000);

    const connectionQualities = this.connectionQualities.get(transferId) || [];
    const avgRtt =
      connectionQualities.length > 0
        ? connectionQualities.reduce((sum, q) => sum + q.rtt, 0) / connectionQualities.length
        : 0;

    logger.info(
      {
        transferId,
        success,
        fileSize: metrics.fileSize,
        fileSizeMB: (metrics.fileSize / 1024 / 1024).toFixed(2),
        duration,
        durationSeconds: (duration / 1000).toFixed(1),
        finalSpeed: metrics.finalSpeed,
        speedMbps: ((metrics.finalSpeed * 8) / 1024 / 1024).toFixed(2),
        averageChunkSize: metrics.averageChunkSize,
        averageChunkSizeKB: (metrics.averageChunkSize / 1024).toFixed(1),
        chunkCount: metrics.chunkCount,
        connectionType: metrics.connectionType,
        averageRtt: avgRtt,
        errorCount: metrics.errorCount,
        pauseCount: metrics.pauseCount,
        resumeCount: metrics.resumeCount,
        efficiency: ((metrics.bytesTransferred / metrics.fileSize) * 100).toFixed(1),
      },
      "transfer_completed"
    );

    // Performance analysis
    this.analyzePerformance(metrics, connectionQualities);

    // Cleanup
    this.metrics.delete(transferId);
    this.connectionQualities.delete(transferId);
    this.lastLoggedMilestone.delete(transferId);
  }

  /**
   * Cleanup stale metrics that haven't completed
   * Called periodically to prevent memory leaks from crashed transfers
   */
  private cleanupStaleMetrics(): void {
    const now = Date.now();
    const staleTransfers: string[] = [];

    // Find stale entries
    for (const [transferId, metrics] of this.metrics.entries()) {
      const age = now - metrics.startTime;
      if (age > this.MAX_STALE_TIME) {
        staleTransfers.push(transferId);
      }
    }

    // Remove stale entries
    for (const transferId of staleTransfers) {
      logger.warn(
        { transferId, age: now - this.metrics.get(transferId)!.startTime },
        "cleaning_up_stale_metrics"
      );
      this.metrics.delete(transferId);
      this.connectionQualities.delete(transferId);
      this.lastLoggedMilestone.delete(transferId);
    }

    // Enforce max entries limit (remove oldest if over limit)
    if (this.metrics.size > this.MAX_ENTRIES) {
      const sortedByAge = Array.from(this.metrics.entries()).sort(
        (a, b) => a[1].startTime - b[1].startTime
      );

      const toRemove = sortedByAge.slice(0, this.metrics.size - this.MAX_ENTRIES);
      for (const [transferId] of toRemove) {
        logger.warn({ transferId }, "removing_old_metrics_due_to_limit");
        this.metrics.delete(transferId);
        this.connectionQualities.delete(transferId);
        this.lastLoggedMilestone.delete(transferId);
      }
    }
  }

  /**
   * Analyze performance and log insights
   */
  private analyzePerformance(metrics: TransferMetrics, qualities: ConnectionQuality[]): void {
    const speedMbps = ((metrics.finalSpeed || 0) * 8) / 1024 / 1024;
    const avgRtt =
      qualities.length > 0 ? qualities.reduce((sum, q) => sum + q.rtt, 0) / qualities.length : 0;

    // Performance classification
    let performanceClass = "unknown";
    if (speedMbps > 50) performanceClass = "excellent";
    else if (speedMbps > 20) performanceClass = "good";
    else if (speedMbps > 5) performanceClass = "fair";
    else performanceClass = "poor";

    // Connection quality analysis
    let connectionQuality = "unknown";
    if (avgRtt < 50) connectionQuality = "excellent";
    else if (avgRtt < 150) connectionQuality = "good";
    else if (avgRtt < 300) connectionQuality = "fair";
    else connectionQuality = "poor";

    logger.info(
      {
        transferId: metrics.transferId,
        performanceClass,
        connectionQuality,
        speedMbps: speedMbps.toFixed(2),
        avgRtt,
        connectionType: metrics.connectionType,
        hadErrors: metrics.errorCount > 0,
        hadPauses: metrics.pauseCount > 0,
      },
      "transfer_analysis"
    );

    // Performance recommendations
    if (performanceClass === "poor" && avgRtt > 200) {
      logger.info(
        {
          transferId: metrics.transferId,
          recommendation: "high_latency_detected",
          suggestion: "Consider using smaller chunk sizes for high-latency connections",
        },
        "performance_recommendation"
      );
    }

    if (metrics.errorCount > 5) {
      logger.info(
        {
          transferId: metrics.transferId,
          recommendation: "high_error_rate",
          suggestion: "Connection instability detected, consider retry mechanisms",
        },
        "performance_recommendation"
      );
    }
  }

  /**
   * Log progress milestones
   */
  private logMilestone(transferId: string, percentage: number): void {
    const metrics = this.metrics.get(transferId);
    if (!metrics) return;

    const elapsed = Date.now() - metrics.startTime;
    const currentSpeed = metrics.bytesTransferred / (elapsed / 1000);
    const speedMbps = ((currentSpeed * 8) / 1024 / 1024).toFixed(2);

    logger.info(
      {
        transferId,
        percentage,
        elapsed,
        currentSpeed,
        speedMbps,
        averageChunkSize: metrics.averageChunkSize,
        chunkCount: metrics.chunkCount,
      },
      "transfer_milestone"
    );
  }

  /**
   * Get current metrics for a transfer (for debugging)
   */
  getMetrics(transferId: string): TransferMetrics | undefined {
    return this.metrics.get(transferId);
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): TransferMetrics[] {
    return Array.from(this.metrics.values());
  }

  /**
   * Get all connection qualities
   */
  getConnectionQualities(transferId: string): ConnectionQuality[] {
    return this.connectionQualities.get(transferId) || [];
  }
}

// Export singleton instance
export const transferMetrics = new TransferMetricsCollector();
