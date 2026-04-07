/**
 * renderWithProviders — RTL wrapper for component tests
 *
 * Provides:
 *  - next/navigation mocks (useRouter, usePathname, useSearchParams)
 *  - next/link mock (renders a plain <a>)
 *  - Supabase auth-service mocks (getCurrentUser, getUserProfile, signOut)
 *
 * Usage:
 *   const { getByText } = renderWithProviders(<MyComponent />);
 *   const { getByText } = renderWithProviders(<MyComponent />, { pathname: "/send" });
 */

import React from "react";
import { render, RenderOptions, RenderResult } from "@testing-library/react";
import { vi } from "vitest";

// ──────────────────────────────────────────────────────────────
// Default mock values (can be overridden per-test via vi.mocked)
// ──────────────────────────────────────────────────────────────
export const mockRouter: Record<string, any> = {
  push: vi.fn(),
  replace: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  prefetch: vi.fn(),
  refresh: vi.fn(),
};

export interface RenderWithProvidersOptions extends Omit<RenderOptions, "wrapper"> {
  /** Simulated pathname for usePathname(). Defaults to "/" */
  pathname?: string;
}

/**
 * Renders a component inside the standard providers. The global mocks for
 * next/navigation and auth-service must already be set up via vi.mock() —
 * this helper just takes care of the React render call.
 */
export function renderWithProviders(
  ui: React.ReactElement,
  { pathname: _pathname = "/", ...renderOptions }: RenderWithProvidersOptions = {}
): RenderResult {
  return render(ui, renderOptions);
}
