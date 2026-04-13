import React from "react";
import { render, screen } from "@testing-library/react";
import { vi, describe, it, expect } from "vitest";
import IncomingOfferCard from "@/components/transfer/incoming-offer-card";
import type { PendingOffer } from "@/lib/hooks/use-receive-transfer";

vi.mock("@repo/utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@repo/utils")>();
  return { ...actual, formatFileSize: (n: number) => `${n} B` };
});

describe("IncomingOfferCard", () => {
  const pendingOffer = {
    filename: "backup.zip",
    fileSize: 2048,
    fileType: "application/zip",
    connection: {} as any,
    message: {} as any,
  } satisfies PendingOffer;

  it("renders without throwing", () => {
    const { container } = render(<IncomingOfferCard pendingOffer={pendingOffer} />);
    expect(container.firstChild).not.toBeNull();
  });

  it("shows 'Incoming File Request' heading", () => {
    render(<IncomingOfferCard pendingOffer={pendingOffer} />);
    expect(screen.getByText(/incoming file request/i)).toBeTruthy();
  });

  it("displays the filename", () => {
    render(<IncomingOfferCard pendingOffer={pendingOffer} />);
    expect(screen.getByText("backup.zip")).toBeTruthy();
  });

  it("shows 'Action Required' badge", () => {
    render(<IncomingOfferCard pendingOffer={pendingOffer} />);
    expect(screen.getByText(/action required/i)).toBeTruthy();
  });

  it("shows 'SECURE LINK' label", () => {
    render(<IncomingOfferCard pendingOffer={pendingOffer} />);
    expect(screen.getByText(/secure link/i)).toBeTruthy();
  });
});
