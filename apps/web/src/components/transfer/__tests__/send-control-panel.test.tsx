import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import SendControlPanel from "../send-control-panel";

const baseProps = {
  receiverPeerId: "",
  onPeerIdChange: vi.fn(),
  onQRScan: vi.fn(),
  password: "",
  onSetPassword: vi.fn(),
  onRemovePassword: vi.fn(),
  onSend: vi.fn(),
  isPeerReady: true,
  hasFile: true,
};

describe("SendControlPanel", () => {
  it("renders the peer ID input", () => {
    render(<SendControlPanel {...baseProps} />);
    expect(screen.getByTestId("peer-id-input")).toBeTruthy();
  });

  it("calls onPeerIdChange when the peer ID input changes", () => {
    const onPeerIdChange = vi.fn();
    render(<SendControlPanel {...baseProps} onPeerIdChange={onPeerIdChange} />);
    fireEvent.change(screen.getByTestId("peer-id-input"), {
      target: { value: "abc123" },
    });
    expect(onPeerIdChange).toHaveBeenCalledWith("abc123");
  });

  it("calls onQRScan when QR scan button is clicked", () => {
    const onQRScan = vi.fn();
    render(<SendControlPanel {...baseProps} onQRScan={onQRScan} />);
    fireEvent.click(screen.getByTestId("scan-qr-button"));
    expect(onQRScan).toHaveBeenCalledOnce();
  });

  it("shows 'Set Encryption Password' button when no password is set", () => {
    render(<SendControlPanel {...baseProps} password="" />);
    expect(screen.getByTestId("set-encryption-password-button")).toBeTruthy();
  });

  it("calls onSetPassword when encryption button is clicked", () => {
    const onSetPassword = vi.fn();
    render(<SendControlPanel {...baseProps} password="" onSetPassword={onSetPassword} />);
    fireEvent.click(screen.getByTestId("set-encryption-password-button"));
    expect(onSetPassword).toHaveBeenCalledOnce();
  });

  it("shows 'Encrypted' badge and Remove button when password is set", () => {
    render(<SendControlPanel {...baseProps} password="secret123" />);
    expect(screen.getByTestId("encryption-status-badge")).toBeTruthy();
    expect(screen.getByTestId("remove-encryption-password-button")).toBeTruthy();
  });

  it("calls onRemovePassword when Remove is clicked", () => {
    const onRemovePassword = vi.fn();
    render(
      <SendControlPanel {...baseProps} password="secret123" onRemovePassword={onRemovePassword} />
    );
    fireEvent.click(screen.getByTestId("remove-encryption-password-button"));
    expect(onRemovePassword).toHaveBeenCalledOnce();
  });

  it("enables initiate transfer button when all conditions met", () => {
    render(
      <SendControlPanel
        {...baseProps}
        receiverPeerId="peer-abc"
        hasFile={true}
        isPeerReady={true}
      />
    );
    const btn = screen.getByTestId("initiate-transfer-button");
    expect((btn as HTMLButtonElement).disabled).toBe(false);
  });

  it("disables initiate transfer button when no file", () => {
    render(
      <SendControlPanel
        {...baseProps}
        receiverPeerId="peer-abc"
        hasFile={false}
        isPeerReady={true}
      />
    );
    const btn = screen.getByTestId("initiate-transfer-button");
    expect((btn as HTMLButtonElement).disabled).toBe(true);
  });

  it("disables initiate transfer button when no peer ID", () => {
    render(<SendControlPanel {...baseProps} receiverPeerId="" hasFile={true} isPeerReady={true} />);
    const btn = screen.getByTestId("initiate-transfer-button");
    expect((btn as HTMLButtonElement).disabled).toBe(true);
  });

  it("disables initiate transfer button when peer is not ready", () => {
    render(
      <SendControlPanel
        {...baseProps}
        receiverPeerId="peer-abc"
        hasFile={true}
        isPeerReady={false}
      />
    );
    const btn = screen.getByTestId("initiate-transfer-button");
    expect((btn as HTMLButtonElement).disabled).toBe(true);
  });

  it("calls onSend when initiate transfer is clicked", () => {
    const onSend = vi.fn();
    render(
      <SendControlPanel
        {...baseProps}
        receiverPeerId="peer-abc"
        hasFile={true}
        isPeerReady={true}
        onSend={onSend}
      />
    );
    fireEvent.click(screen.getByTestId("initiate-transfer-button"));
    expect(onSend).toHaveBeenCalledOnce();
  });
});
