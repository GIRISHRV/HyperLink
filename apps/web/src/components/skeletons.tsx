import React from "react";

export function CardSkeleton() {
    return (
        <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-sm animate-pulse">
            <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-sm" />
                <div className="flex-1">
                    <div className="h-4 bg-white/10 backdrop-blur-sm rounded w-3/4 mb-2" />
                    <div className="h-3 bg-white/5 backdrop-blur-sm rounded w-1/2" />
                </div>
            </div>
            <div className="space-y-2">
                <div className="h-3 bg-white/5 backdrop-blur-sm rounded w-full" />
                <div className="h-3 bg-white/5 backdrop-blur-sm rounded w-5/6" />
            </div>
        </div>
    );
}

export function TableRowSkeleton() {
    return (
        <tr className="border-b border-white/5 animate-pulse">
            <td className="py-5 px-6">
                <div className="flex items-center gap-3">
                    <div className="size-10 bg-white/10 backdrop-blur-sm rounded-sm" />
                    <div className="h-4 bg-white/10 backdrop-blur-sm rounded w-48" />
                </div>
            </td>
            <td className="py-5 px-6">
                <div className="h-3 bg-white/5 backdrop-blur-sm rounded w-16" />
            </td>
            <td className="py-5 px-6">
                <div className="flex items-center gap-2">
                    <div className="size-6 bg-white/10 backdrop-blur-sm rounded-full" />
                    <div className="h-3 bg-white/10 backdrop-blur-sm rounded w-20" />
                </div>
            </td>
            <td className="py-5 px-6">
                <div className="h-6 bg-white/10 backdrop-blur-sm rounded w-24" />
            </td>
            <td className="py-5 px-6 text-right">
                <div className="h-3 bg-white/5 backdrop-blur-sm rounded w-32 ml-auto" />
            </td>
        </tr>
    );
}

export function ListSkeleton() {
    return (
        <div className="space-y-3">
            {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4 p-4 bg-white/5 backdrop-blur-md border border-white/10 rounded-sm animate-pulse">
                    <div className="size-12 bg-white/10 backdrop-blur-sm rounded-sm" />
                    <div className="flex-1 space-y-2">
                        <div className="h-4 bg-white/10 backdrop-blur-sm rounded w-3/4" />
                        <div className="h-3 bg-white/5 backdrop-blur-sm rounded w-1/2" />
                    </div>
                    <div className="h-8 bg-white/10 backdrop-blur-sm rounded w-20" />
                </div>
            ))}
        </div>
    );
}

export function DashboardSkeleton() {
    return (
        <div className="space-y-6 animate-pulse">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-sm">
                        <div className="h-4 bg-white/10 backdrop-blur-sm rounded w-1/2 mb-4" />
                        <div className="h-8 bg-white/10 backdrop-blur-sm rounded w-3/4 mb-2" />
                        <div className="h-3 bg-white/5 backdrop-blur-sm rounded w-1/3" />
                    </div>
                ))}
            </div>

            {/* Recent Transfers */}
            <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-sm">
                <div className="h-6 bg-white/10 backdrop-blur-sm rounded w-48 mb-6" />
                <div className="space-y-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="flex items-center gap-4 pb-4 border-b border-white/5 last:border-0">
                            <div className="size-10 bg-white/10 backdrop-blur-sm rounded-sm" />
                            <div className="flex-1 space-y-2">
                                <div className="h-4 bg-white/10 backdrop-blur-sm rounded w-2/3" />
                                <div className="h-3 bg-white/5 backdrop-blur-sm rounded w-1/3" />
                            </div>
                            <div className="h-6 bg-white/10 backdrop-blur-sm rounded w-20" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
