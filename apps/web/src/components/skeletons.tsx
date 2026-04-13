import React from "react";

export function CardSkeleton() {
  return (
    <div className="rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.08] to-white/[0.03] p-6 animate-pulse">
      <div className="flex items-center gap-4 mb-4">
        <div className="w-12 h-12 bg-white/10 rounded-lg" />
        <div className="flex-1">
          <div className="h-4 bg-white/10 rounded-full w-3/4 mb-2" />
          <div className="h-3 bg-white/5 rounded-full w-1/2" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3 bg-white/5 rounded-full w-full" />
        <div className="h-3 bg-white/5 rounded-full w-5/6" />
      </div>
    </div>
  );
}

export function TableRowSkeleton() {
  return (
    <tr className="border-b border-white/5 animate-pulse">
      <td className="py-5 px-6">
        <div className="flex items-center gap-3">
          <div className="size-10 bg-white/10 rounded-lg" />
          <div className="h-4 bg-white/10 rounded-full w-48" />
        </div>
      </td>
      <td className="py-5 px-6">
        <div className="h-3 bg-white/5 rounded-full w-16" />
      </td>
      <td className="py-5 px-6">
        <div className="h-4 bg-white/10 rounded-full w-16" />
      </td>
      <td className="py-5 px-6">
        <div className="flex items-center gap-2">
          <div className="size-6 bg-white/10 rounded-full" />
          <div className="h-3 bg-white/10 rounded-full w-20" />
        </div>
      </td>
      <td className="py-5 px-6">
        <div className="h-6 bg-white/10 rounded-full w-24" />
      </td>
      <td className="py-5 px-6 text-right">
        <div className="h-3 bg-white/5 rounded-full w-32 ml-auto" />
      </td>
    </tr>
  );
}

export function ListSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="flex items-center gap-4 p-4 rounded-xl border border-white/10 bg-gradient-to-r from-white/[0.07] to-white/[0.03] animate-pulse"
        >
          <div className="size-12 bg-white/10 rounded-lg" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-white/10 rounded-full w-3/4" />
            <div className="h-3 bg-white/5 rounded-full w-1/2" />
          </div>
          <div className="h-8 bg-white/10 rounded-full w-20" />
        </div>
      ))}
    </div>
  );
}
