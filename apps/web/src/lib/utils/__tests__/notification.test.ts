/**
 * Phase 2 — Notification utilities (notification.ts)
 *
 * Tests for: isSecureContext, requestNotificationPermission,
 * showTransferNotification, notifyTransferComplete,
 * playSuccessSound, playErrorSound, playConnectionSound.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock AudioContext ──────────────────────────────────────────────────

const mockOscillator = {
  connect: vi.fn(),
  frequency: { value: 0 },
  type: "" as OscillatorType,
  start: vi.fn(),
  stop: vi.fn(),
};

const mockGain = {
  connect: vi.fn(),
  gain: {
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
  },
};

const mockAudioCtx = {
  currentTime: 0,
  createOscillator: vi.fn(function() { return mockOscillator; }),
  createGain: vi.fn(function() { return mockGain; }),
  close: vi.fn(),
  destination: {},
};

// IMPORTANT: must use a regular function (not arrow) so it can be called with `new`.
// vi.fn(impl) where impl is a regular function works as a constructor.
const AudioContextMock = vi.fn(function AudioContextCtor() { return mockAudioCtx; });
vi.stubGlobal("AudioContext", AudioContextMock);

// ─── Mock Notification ──────────────────────────────────────────────────

const mockNotificationInstance = {
  close: vi.fn(),
  onclick: null as null | (() => void),
};

const NotificationMock = Object.assign(
  vi.fn(function NotifCtor() { return mockNotificationInstance; }),
  {
    permission: "granted" as NotificationPermission,
    requestPermission: vi.fn(function() { return Promise.resolve("granted"); }),
  }
);

vi.stubGlobal("Notification", NotificationMock);

// ─── Import under test ──────────────────────────────────────────────────

import {
  isSecureContext,
  requestNotificationPermission,
  showTransferNotification,
  notifyTransferComplete,
  playSuccessSound,
  playErrorSound,
  playConnectionSound,
} from "../notification";

// ─── Per-test reset ─────────────────────────────────────────────────────

function resetMocks() {
  [
    AudioContextMock, NotificationMock, NotificationMock.requestPermission,
    mockAudioCtx.createOscillator, mockAudioCtx.createGain, mockAudioCtx.close,
    mockOscillator.connect, mockOscillator.start, mockOscillator.stop,
    mockGain.connect, mockGain.gain.setValueAtTime, mockGain.gain.linearRampToValueAtTime,
    mockNotificationInstance.close,
  ].forEach((m) => m.mockClear());

  NotificationMock.requestPermission.mockImplementation(function() { return Promise.resolve("granted"); });
  NotificationMock.permission = "granted";
  mockAudioCtx.currentTime = 0;
  vi.stubGlobal("AudioContext", AudioContextMock);
  vi.stubGlobal("Notification", NotificationMock);
}

describe("Notification utilities", () => {
  beforeEach(resetMocks);

  // ─── isSecureContext ──────────────────────────────────────────────────

  describe("isSecureContext", () => {
    it("returns true when window.isSecureContext is true", () => {
      vi.stubGlobal("isSecureContext", true);
      expect(isSecureContext()).toBe(true);
    });

    it("returns false when window.isSecureContext is false", () => {
      vi.stubGlobal("isSecureContext", false);
      expect(isSecureContext()).toBe(false);
    });
  });

  // ─── requestNotificationPermission ───────────────────────────────────

  describe("requestNotificationPermission", () => {
    it("returns true when permission is already granted", async () => {
      NotificationMock.permission = "granted";
      const result = await requestNotificationPermission();
      expect(result).toBe(true);
      expect(NotificationMock.requestPermission).not.toHaveBeenCalled();
    });

    it("returns false when Notification is not in window", async () => {
      const original = (globalThis as Record<string, unknown>).Notification;
      delete (globalThis as Record<string, unknown>).Notification;

      const result = await requestNotificationPermission();
      expect(result).toBe(false);

      (globalThis as Record<string, unknown>).Notification = original;
    });

    it("requests permission and returns true when granted", async () => {
      NotificationMock.permission = "default" as NotificationPermission;
      NotificationMock.requestPermission.mockImplementationOnce(
        function() { return Promise.resolve("granted"); }
      );

      const result = await requestNotificationPermission();
      expect(NotificationMock.requestPermission).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it("returns false when user denies permission request", async () => {
      NotificationMock.permission = "default" as NotificationPermission;
      NotificationMock.requestPermission.mockImplementationOnce(
        function() { return Promise.resolve("denied"); }
      );

      const result = await requestNotificationPermission();
      expect(result).toBe(false);
    });

    it("returns false when permission is already denied (no re-request)", async () => {
      NotificationMock.permission = "denied" as NotificationPermission;

      const result = await requestNotificationPermission();
      expect(NotificationMock.requestPermission).not.toHaveBeenCalled();
      expect(result).toBe(false);
    });
  });

  // ─── showTransferNotification ─────────────────────────────────────────

  describe("showTransferNotification", () => {
    it("creates a Notification with correct title for sent transfer", () => {
      showTransferNotification("sent", "photo.jpg");

      expect(NotificationMock).toHaveBeenCalledWith(
        "File Sent Successfully",
        expect.objectContaining({ body: expect.stringContaining("photo.jpg") })
      );
    });

    it("creates a Notification with correct title for received transfer", () => {
      showTransferNotification("received", "document.pdf");

      expect(NotificationMock).toHaveBeenCalledWith(
        "File Received",
        expect.objectContaining({ body: expect.stringContaining("document.pdf") })
      );
    });

    it("does nothing when Notification permission is not granted", () => {
      NotificationMock.permission = "denied" as NotificationPermission;

      showTransferNotification("sent", "file.txt");

      expect(NotificationMock).not.toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object)
      );
    });

    it("does nothing when Notification is not available", () => {
      const original = (globalThis as Record<string, unknown>).Notification;
      delete (globalThis as Record<string, unknown>).Notification;

      expect(() => showTransferNotification("sent", "file.txt")).not.toThrow();

      (globalThis as Record<string, unknown>).Notification = original;
    });
  });

  // ─── notifyTransferComplete ───────────────────────────────────────────

  describe("notifyTransferComplete", () => {
    it("creates AudioContext (plays sound) and shows notification", () => {
      notifyTransferComplete("sent", "archive.zip");

      expect(AudioContextMock).toHaveBeenCalled();
      expect(NotificationMock).toHaveBeenCalled();
    });

    it("does not throw when audio context creation fails", () => {
      AudioContextMock.mockImplementationOnce(function() {
        throw new Error("no audio");
      });

      expect(() => notifyTransferComplete("received", "file.bin")).not.toThrow();
    });
  });

  // ─── audio functions ──────────────────────────────────────────────────

  describe("audio functions", () => {
    it("playSuccessSound creates AudioContext and schedules two oscillators", () => {
      playSuccessSound();

      expect(AudioContextMock).toHaveBeenCalled();
      expect(mockAudioCtx.createOscillator).toHaveBeenCalledTimes(2);
      expect(mockOscillator.start).toHaveBeenCalledTimes(2);
    });

    it("playErrorSound creates AudioContext and schedules two tone oscillators", () => {
      playErrorSound();

      expect(AudioContextMock).toHaveBeenCalled();
      expect(mockAudioCtx.createOscillator).toHaveBeenCalledTimes(2);
    });

    it("playConnectionSound creates AudioContext with single oscillator", () => {
      playConnectionSound();

      expect(AudioContextMock).toHaveBeenCalled();
      expect(mockAudioCtx.createOscillator).toHaveBeenCalledTimes(1);
    });

    it("playSuccessSound does not throw when AudioContext is unavailable", () => {
      vi.stubGlobal("AudioContext", undefined);

      expect(() => playSuccessSound()).not.toThrow();

      vi.stubGlobal("AudioContext", AudioContextMock);
    });
  });
});
