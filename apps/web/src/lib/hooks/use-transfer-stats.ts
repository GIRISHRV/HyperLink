import { useState, useEffect } from "react";
import { getUserTransferStats } from "@/lib/services/transfer-service";

export interface TransferStats {
    totalBytes: number;
    totalTransfers: number;
    isLoading: boolean;
}

export function useTransferStats() {
    const [stats, setStats] = useState<TransferStats>({
        totalBytes: 0,
        totalTransfers: 0,
        isLoading: true,
    });

    useEffect(() => {
        async function fetchStats() {
            try {
                const data = await getUserTransferStats();
                if (data) {
                    setStats({
                        totalBytes: data.totalBytes,
                        totalTransfers: data.totalTransfers,
                        isLoading: false,
                    });
                } else {
                    setStats((prev) => ({ ...prev, isLoading: false }));
                }
            } catch (error) {
                console.error("Failed to fetch transfer stats", error);
                setStats((prev) => ({ ...prev, isLoading: false }));
            }
        }

        fetchStats();
    }, []);

    return stats;
}
