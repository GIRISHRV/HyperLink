import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import AuthPage from "../page";

// Mocks
const mockReplace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

vi.mock("@/components/app-header", () => ({
  default: () => <div data-testid="mock-app-header">Header</div>,
}));

const mockSignIn = vi.fn();
const mockSignUp = vi.fn();
const mockSignInWithMagicLink = vi.fn();
const mockResetPassword = vi.fn();
const mockGetCurrentUser = vi.fn();

vi.mock("@/lib/services/auth-service", () => ({
  signIn: (...args: unknown[]) => mockSignIn(...args),
  signUp: (...args: unknown[]) => mockSignUp(...args),
  signInWithMagicLink: (...args: unknown[]) => mockSignInWithMagicLink(...args),
  resetPassword: (...args: unknown[]) => mockResetPassword(...args),
  getCurrentUser: () => mockGetCurrentUser(),
}));

vi.mock("@repo/utils", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock("@/lib/utils/auth-redirect", () => ({
  getSafeRedirect: vi.fn(() => "/history"),
}));

describe("AuthPage Security Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCurrentUser.mockResolvedValue(null);
  });

  it("enforces password length client-side (SEC-003)", async () => {
    render(<AuthPage />);

    // Wait for the skeleton to disappear and the form to appear
    await waitFor(
      () => {
        expect(screen.queryByText("Authentication Portal")).toBeInTheDocument();
      },
      { timeout: 4000 }
    );

    // Switch to sign up mode
    fireEvent.click(screen.getByRole("button", { name: /new here\? create account/i }));

    // Enter short password
    fireEvent.change(screen.getByPlaceholderText("user@hyperlink.network"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("••••••••••••"), {
      target: { value: "short" },
    });

    // Submit
    fireEvent.click(screen.getByRole("button", { name: /Create Account/i }));

    // Client-side validation should block the call to Supabase
    await waitFor(() => {
      expect(mockSignUp).not.toHaveBeenCalled();
    });

    // Check for client-side error message
    await waitFor(() => {
      expect(screen.getByText("Password must be at least 8 characters.")).toBeInTheDocument();
    });
  });

  it("normalizes error messages (SEC-005)", async () => {
    render(<AuthPage />);

    await waitFor(
      () => {
        expect(screen.queryByText("Authentication Portal")).toBeInTheDocument();
      },
      { timeout: 4000 }
    );

    mockSignIn.mockRejectedValueOnce(new Error("Invalid login credentials"));

    fireEvent.change(screen.getByPlaceholderText("user@hyperlink.network"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("••••••••••••"), {
      target: { value: "password123" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Sign In/i }));

    await waitFor(() => {
      expect(screen.getByText("Invalid email or password.")).toBeInTheDocument();
    });
  });
});
