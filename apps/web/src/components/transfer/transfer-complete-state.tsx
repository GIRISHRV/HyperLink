"use client";

interface TransferCompleteStateProps {
  fileName: string;
  onReset: () => void;
}

export default function TransferCompleteState({
  fileName,
  onReset,
}: TransferCompleteStateProps) {
  return (
    <div className="text-center py-12">
      <div className="w-16 h-16 mx-auto mb-4 bg-green-500 flex items-center justify-center">
        <span className="material-symbols-outlined text-3xl text-white">
          check
        </span>
      </div>
      <h3 className="text-2xl font-bold text-white mb-2 uppercase">
        Transfer Complete!
      </h3>
      <p className="text-gray-400 mb-6 font-mono text-sm">
        {fileName} has been sent successfully
      </p>
      <button
        onClick={onReset}
        className="px-6 py-3 bg-primary hover:bg-white text-black font-semibold transition-colors"
      >
        Send Another File
      </button>
    </div>
  );
}
