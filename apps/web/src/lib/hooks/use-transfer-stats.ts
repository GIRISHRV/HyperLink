import { useState, useEffect } from "react";
import { getUserTransferStats } from "@/lib/services/transfer-service";
import { logger } from "@repo/utils";

export interface TransferStats {
    totalBytes: number;
    totalTransfers: number;
    isLoading: boolean;
}

/**
 * SEC-007: userId is only used as a readiness signal.
 * The RPC uses auth.uid() server-side — no user ID is sent over the wire.
 */
export function useTransferStats(userId?: string) {
    const [stats, setStats] = useState<TransferStats>({
        totalBytes: 0,
        totalTransfers: 0,
        isLoading: true,
    });

    useEffect(() => {
        async function fetchStats() {
            if (!userId) {
                setStats((prev) => ({ ...prev, isLoading: false }));
                return;
            }

            try {
                const data = await getUserTransferStats();
                if (data) {
                    setStats({
                        totalBytes: data.totalBytesSent,
                        totalTransfers: data.totalTransfers,
                        isLoading: false,
                    });
                } else {
                    setStats((prev) => ({ ...prev, isLoading: false }));
                }
            } catch (error) {
                logger.error({ error }, "Failed to fetch transfer stats");
                setStats((prev) => ({ ...prev, isLoading: false }));
            }
        }

        fetchStats();
    }, [userId]);

    return stats;
}
