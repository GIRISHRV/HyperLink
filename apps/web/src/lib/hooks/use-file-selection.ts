import { useState, useRef, useCallback, useEffect } from "react";
import { formatFileSize, validateFileSize, logger } from "@repo/utils";
import { zipFiles, getFilesFromDataTransferItems } from "@/lib/utils/zip-helper";
import { useClipboardFile } from "@/lib/hooks/use-clipboard-file";

interface UseFileSelectionOptions {
  onLog?: (message: string) => void;
}

export function useFileSelection({ onLog }: UseFileSelectionOptions = {}) {
  const [file, setFile] = useState<File | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const [zipProgress, setZipProgress] = useState(0);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addLog = useCallback(
    (message: string) => {
      onLog?.(message);
    },
    [onLog]
  );

  const processFiles = useCallback(
    async (files: File[]) => {
      const totalSize = files.reduce((acc, f) => acc + f.size, 0);
      const MAX_SIZE = 10 * 1024 * 1024 * 1024; // 10GB
      if (totalSize > MAX_SIZE) {
        setError(
          `Total size (${formatFileSize(totalSize)}) exceeds the 10GB limit for browser zipping.`
        );
        addLog(`✗ Size limit exceeded: ${formatFileSize(totalSize)}`);
        return;
      }

      const isSingleFile = files.length === 1;
      const hasPath =
        files[0].webkitRelativePath &&
        files[0].webkitRelativePath.includes("/");

      if (isSingleFile && !hasPath) {
        const selectedFile = files[0];
        const validation = validateFileSize(selectedFile.size);
        if (!validation.valid) {
          setError(validation.error!);
          addLog(`✗ File validation failed: ${validation.error}`);
          return;
        }
        setFile(selectedFile);
        setError("");
        addLog(
          `✓ File selected: ${selectedFile.name} (${formatFileSize(selectedFile.size)})`
        );
      } else {
        try {
          setIsZipping(true);
          setZipProgress(0);
          setError("");
          addLog(`> Zipping ${files.length} files...`);
          const zippedFile = await zipFiles(files, (percent) =>
            setZipProgress(percent)
          );
          setFile(zippedFile);
          addLog(
            `✓ Zipping complete: ${zippedFile.name} (${formatFileSize(zippedFile.size)})`
          );
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          logger.error({ err }, "Zipping failed:");
          setError("Failed to zip files. Browser memory might be full.");
          addLog(`✗ Zipping error: ${message}`);
        } finally {
          setIsZipping(false);
        }
      }
    },
    [addLog]
  );

  // Global drag/drop listeners
  useEffect(() => {
    const handleGlobalDragEnter = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer?.types.includes("Files")) {
        setIsDraggingOver(true);
      }
    };

    const handleGlobalDragLeave = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.relatedTarget === null) {
        setIsDraggingOver(false);
      }
    };

    const handleGlobalDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDraggingOver(true);
    };

    const handleGlobalDrop = async (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDraggingOver(false);

      if (e.dataTransfer && e.dataTransfer.items) {
        const droppedFiles = await getFilesFromDataTransferItems(
          e.dataTransfer.items
        );
        if (droppedFiles.length > 0) {
          addLog(`✓ Dropped ${droppedFiles.length} file(s)`);
          await processFiles(droppedFiles);
        }
      }
    };

    window.addEventListener("dragenter", handleGlobalDragEnter);
    window.addEventListener("dragleave", handleGlobalDragLeave);
    window.addEventListener("dragover", handleGlobalDragOver);
    window.addEventListener("drop", handleGlobalDrop);

    return () => {
      window.removeEventListener("dragenter", handleGlobalDragEnter);
      window.removeEventListener("dragleave", handleGlobalDragLeave);
      window.removeEventListener("dragover", handleGlobalDragOver);
      window.removeEventListener("drop", handleGlobalDrop);
    };
  }, [processFiles, addLog]);

  // Clipboard paste handling
  const handlePaste = useCallback(
    (pastedFile: File) => {
      processFiles([pastedFile]);
    },
    [processFiles]
  );
  useClipboardFile(handlePaste);

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = Array.from(e.target.files || []);
      if (selectedFiles.length === 0) return;
      await processFiles(selectedFiles);
    },
    [processFiles]
  );

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      const items = e.dataTransfer.items;
      const droppedFiles = await getFilesFromDataTransferItems(items);
      if (droppedFiles.length === 0) return;
      await processFiles(droppedFiles);
    },
    [processFiles]
  );

  const removeFile = useCallback(() => {
    setFile(null);
    addLog("File removed from queue");
  }, [addLog]);

  return {
    file,
    setFile,
    isDraggingOver,
    isZipping,
    zipProgress,
    error,
    setError,
    fileInputRef,
    processFiles,
    handleFileSelect,
    handleDrop,
    removeFile,
  };
}
