import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import FileDropZone from "../file-drop-zone";
import { createRef } from "react";

function makeRef() {
  const ref = createRef<HTMLInputElement>();
  return ref;
}

describe("FileDropZone", () => {
  it("renders the drop zone", () => {
    render(
      <FileDropZone file={null} fileInputRef={makeRef()} onDrop={vi.fn()} onFileSelect={vi.fn()} />
    );
    expect(screen.getByRole("button")).toBeTruthy();
  });

  it("shows 'Select a File' when no file is selected", () => {
    render(
      <FileDropZone file={null} fileInputRef={makeRef()} onDrop={vi.fn()} onFileSelect={vi.fn()} />
    );
    expect(screen.getByText("Select a File")).toBeTruthy();
  });

  it("shows drag-and-drop hint when no file", () => {
    render(
      <FileDropZone file={null} fileInputRef={makeRef()} onDrop={vi.fn()} onFileSelect={vi.fn()} />
    );
    expect(screen.getByText("Drag and drop here or click to browse")).toBeTruthy();
  });

  it("shows file name when a file is provided", () => {
    const file = new File(["data"], "document.pdf", { type: "application/pdf" });
    render(
      <FileDropZone file={file} fileInputRef={makeRef()} onDrop={vi.fn()} onFileSelect={vi.fn()} />
    );
    expect(screen.getByText("document.pdf")).toBeTruthy();
  });

  it("calls onDrop when file is dropped", () => {
    const onDrop = vi.fn();
    render(
      <FileDropZone file={null} fileInputRef={makeRef()} onDrop={onDrop} onFileSelect={vi.fn()} />
    );
    fireEvent.drop(screen.getByRole("button"), {
      dataTransfer: { files: [] },
    });
    expect(onDrop).toHaveBeenCalledOnce();
  });

  it("has correct aria-label for accessibility", () => {
    render(
      <FileDropZone file={null} fileInputRef={makeRef()} onDrop={vi.fn()} onFileSelect={vi.fn()} />
    );
    const btn = screen.getByRole("button");
    expect(btn.getAttribute("aria-label")).toContain("File drop zone");
  });
});
