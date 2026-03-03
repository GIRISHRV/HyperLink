"use client";

export default function DragOverlay() {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center pointer-events-none animate-in fade-in duration-200">
      <div className="w-64 h-64 rounded-full border-4 border-dashed border-primary animate-[spin_10s_linear_infinite] flex items-center justify-center mb-8">
        <div className="w-48 h-48 rounded-full bg-primary/20 animate-pulse"></div>
      </div>
      <h2 className="text-4xl font-black text-white uppercase tracking-tighter">
        Drop Payload Here
      </h2>
      <p className="text-primary font-mono mt-4">
        Initiating Transfer Sequence
      </p>
    </div>
  );
}
