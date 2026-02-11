"use client";

import { useEffect, useState } from "react";
import { formatFileSize } from "@repo/utils";
import { Ripple } from "@/components/ripple";

interface FilePreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    file: Blob;
    filename: string;
}

export default function FilePreviewModal({
    isOpen,
    onClose,
    file,
    filename,
}: FilePreviewModalProps) {
    const [objectUrl, setObjectUrl] = useState<string | null>(null);
    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");

    useEffect(() => {
        if (isOpen && file) {
            const url = URL.createObjectURL(file);
            setObjectUrl(url);
            return () => URL.revokeObjectURL(url);
        }
    }, [isOpen, file]);

    if (!isOpen || !objectUrl) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={onClose}
            />

            <div className="relative w-full max-w-5xl bg-[#1a1a1a] border border-white/10 rounded-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#222]">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <span className="material-symbols-outlined text-primary">
                            {isImage ? "image" : isVideo ? "movie" : "description"}
                        </span>
                        <div className="flex flex-col min-w-0">
                            <h3 className="text-sm font-bold text-white truncate">{filename}</h3>
                            <p className="text-xs text-gray-400 font-mono">{formatFileSize(file.size)}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <a
                            href={objectUrl}
                            download={filename}
                            className="flex items-center justify-center size-8 rounded-sm hover:bg-white/10 text-gray-400 hover:text-white transition-colors relative overflow-hidden"
                            title="Download"
                        >
                            <span className="material-symbols-outlined text-[20px] relative z-10">download</span>
                            <Ripple />
                        </a>
                        <button
                            onClick={onClose}
                            className="flex items-center justify-center size-8 rounded-sm hover:bg-white/10 text-gray-400 hover:text-white transition-colors relative overflow-hidden"
                        >
                            <span className="material-symbols-outlined text-[20px] relative z-10">close</span>
                            <Ripple />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto bg-[#0f0f0f] flex items-center justify-center p-4 min-h-[300px]">
                    {isImage && (
                        <img
                            src={objectUrl}
                            alt={filename}
                            className="max-w-full max-h-[75vh] object-contain rounded-sm shadow-lg"
                        />
                    )}
                    {isVideo && (
                        <video
                            src={objectUrl}
                            controls
                            autoPlay
                            className="max-w-full max-h-[75vh] rounded-sm shadow-lg"
                        />
                    )}
                    {!isImage && !isVideo && (
                        <div className="flex flex-col items-center gap-4 text-gray-500">
                            <span className="material-symbols-outlined text-6xl">draft</span>
                            <p>Preview not available for this file type.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
