// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act, fireEvent, waitFor } from "@testing-library/react";
import AppHeader from "@/components/app-header";

// ──────────────────────────────────────────────────────────────
// Mocks
// ──────────────────────────────────────────────────────────────
const mockPush = vi.fn();
let mockPathname = "/dashboard";

vi.mock("next/navigation", () => ({
    useRouter: () => ({ push: mockPush, replace: vi.fn(), back: vi.fn() }),
    usePathname: () => mockPathname,
}));

vi.mock("next/link", () => ({
    default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
        <a href={href} className={className}>{children}</a>
    ),
}));

vi.mock("@/lib/services/auth-service", () => ({
    getCurrentUser: vi.fn().mockResolvedValue(null),
    signOut: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/services/profile-service", () => ({
    getUserProfile: vi.fn().mockResolvedValue(null),
}));

vi.mock("@repo/utils", () => ({
    AVATAR_COLOR_MAP: {},
    DEFAULT_AVATAR_COLOR: { value: "bg-gray-500", text: "text-white" },
}));

vi.mock("@/components/ripple", () => ({
    Ripple: () => <span data-testid="ripple" />,
}));

// ──────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────
async function renderHeader(props: Parameters<typeof AppHeader>[0] = {}) {
    let result!: ReturnType<typeof render>;
    await act(async () => {
        result = render(<AppHeader {...props} />);
    });
    return result;
}

// ──────────────────────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────────────────────
describe("AppHeader", () => {
    beforeEach(() => {
        mockPathname = "/dashboard";
        mockPush.mockClear();
    });

    // — Landing variant —
    describe("landing variant", () => {
        it("renders the HyperLink logo text", async () => {
            await renderHeader({ variant: "landing" });
            expect(screen.getByText("HyperLink")).toBeInTheDocument();
        });

        it("renders How it Works nav link", async () => {
            await renderHeader({ variant: "landing" });
            expect(screen.getByText("How it Works")).toBeInTheDocument();
        });

        it("renders Status nav link", async () => {
            await renderHeader({ variant: "landing" });
            expect(screen.getByText("Status")).toBeInTheDocument();
        });

        it("renders Login link when user is not authenticated", async () => {
            await renderHeader({ variant: "landing" });
            await waitFor(() => {
                expect(screen.getByText("Login")).toBeInTheDocument();
            });
        });
    });

    // — App variant —
    describe("app variant", () => {
        it("renders the HyperLink logo", async () => {
            await renderHeader({ variant: "app" });
            expect(screen.getByText("HyperLink")).toBeInTheDocument();
        });

        it("renders Dashboard nav link", async () => {
            await renderHeader({ variant: "app" });
            expect(screen.getAllByText("Dashboard")[0]).toBeInTheDocument();
        });

        it("renders History nav link", async () => {
            await renderHeader({ variant: "app" });
            expect(screen.getByText("History")).toBeInTheDocument();
        });

        it("renders Settings nav link", async () => {
            await renderHeader({ variant: "app" });
            expect(screen.getByText("Settings")).toBeInTheDocument();
        });

        it("renders sign-out button", async () => {
            await renderHeader({ variant: "app" });
            const logoutBtn = screen.getByTitle("Sign Out");
            expect(logoutBtn).toBeInTheDocument();
        });

        it("calls signOut and redirects on sign-out click", async () => {
            const { signOut } = await import("@/lib/services/auth-service");
            await renderHeader({ variant: "app" });
            const logoutBtn = screen.getByTitle("Sign Out");
            await act(async () => { fireEvent.click(logoutBtn); });
            expect(signOut).toHaveBeenCalled();
        });
    });

    // — Transfer variant —
    describe("transfer variant", () => {
        it("renders the HYPER logo text", async () => {
            await renderHeader({ variant: "transfer" });
            expect(screen.getByText("HYPER")).toBeInTheDocument();
        });

        it("shows Initializing... when isPeerReady=false", async () => {
            await renderHeader({ variant: "transfer", isPeerReady: false });
            expect(screen.getAllByText("Initializing...")[0]).toBeInTheDocument();
        });

        it("shows System Ready when isPeerReady=true", async () => {
            await renderHeader({ variant: "transfer", isPeerReady: true });
            expect(screen.getAllByText("System Ready")[0]).toBeInTheDocument();
        });

        it("renders Dashboard back button", async () => {
            await renderHeader({ variant: "transfer" });
            expect(screen.getByRole("button", { name: /back to dashboard/i })).toBeInTheDocument();
        });

        it("calls router.push('/dashboard') when back button clicked without onBackCheck", async () => {
            await renderHeader({ variant: "transfer", status: "idle" });
            const backBtn = screen.getByRole("button", { name: /back to dashboard/i });
            await act(async () => { fireEvent.click(backBtn); });
            expect(mockPush).toHaveBeenCalledWith("/dashboard");
        });

        it("calls onBackCheck before navigating", async () => {
            const onBackCheck = vi.fn().mockReturnValue(true);
            await renderHeader({ variant: "transfer", onBackCheck });
            const backBtn = screen.getByRole("button", { name: /back to dashboard/i });
            await act(async () => { fireEvent.click(backBtn); });
            expect(onBackCheck).toHaveBeenCalled();
        });

        it("does not navigate when onBackCheck returns false", async () => {
            const onBackCheck = vi.fn().mockReturnValue(false);
            await renderHeader({ variant: "transfer", onBackCheck });
            const backBtn = screen.getByRole("button", { name: /back to dashboard/i });
            await act(async () => { fireEvent.click(backBtn); });
            expect(mockPush).not.toHaveBeenCalled();
        });
    });

    // — Mobile menu —
    describe("mobile menu toggle", () => {
        it("opens mobile menu when hamburger is clicked", async () => {
            await renderHeader({ variant: "app" });
            const toggle = screen.getByRole("button", { name: /open menu/i });
            await act(async () => { fireEvent.click(toggle); });
            // The mobile menu renders two close buttons; just verify at least one exists
            expect(screen.getAllByRole("button", { name: /close menu/i }).length).toBeGreaterThan(0);
        });
    });

    // — Network badge —
    describe("network badge", () => {
        it("shows Online status", async () => {
            await renderHeader({ variant: "app" });
            expect(screen.getByRole("status", { name: /online/i })).toBeInTheDocument();
        });
    });
});
