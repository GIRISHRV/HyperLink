import { defineConfig, devices } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";
import { config as loadEnv } from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.local so E2E_TEST_EMAIL / E2E_TEST_PASSWORD are available to auth.setup.ts
loadEnv({ path: path.resolve(__dirname, ".env.local") });

const authFileChrome = path.join(__dirname, "e2e/.auth/user-chromium.json");
const authFileFirefox = path.join(__dirname, "e2e/.auth/user-firefox.json");

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 3 : 1, // More retries in CI for flaky WebRTC tests
  workers: 4, // 4 workers to run browser projects in parallel
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  timeout: 60_000, // Increased to 60s for CI environments

  use: {
    baseURL: "http://localhost:3000",
    trace: "off",
    screenshot: "off",
    video: "off",
    launchOptions: {
      // slowMo: 100,
    },
  },

  projects: [
    // 1(a). Run auth setup for Chromium — logs in and saves storageState
    {
      name: "setup",
      use: { ...devices["Desktop Chrome"] },
      testMatch: /auth\.setup\.ts/,
    },
    // 1(b). Run auth setup for Firefox — handles unique cross-origin localhost cookie states
    {
      name: "setup-firefox",
      use: { ...devices["Desktop Firefox"] },
      testMatch: /auth\.setup\.ts/,
    },

    // 2. Authenticated tests — reuse saved session, run after setup
    {
      name: "authenticated",
      dependencies: ["setup"],
      use: {
        ...devices["Desktop Chrome"],
        storageState: authFileChrome,
      },
      testMatch: /authenticated\/.*\.spec\.ts/,
    },
    {
      name: "authenticated-firefox",
      dependencies: ["setup-firefox"],
      use: {
        ...devices["Desktop Firefox"],
        storageState: authFileFirefox,
        // Firefox needs longer timeouts for WebRTC and navigation
        navigationTimeout: 60_000,
        actionTimeout: 15_000,
      },
      testMatch: /authenticated\/.*\.spec\.ts/,
    },

    // 3. Unauthenticated tests — existing specs in e2e/ root (no session)
    // Runs on Chromium and Firefox only
    // NOTE: testIgnore excludes the authenticated/ subfolder (Windows-safe)
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      testMatch: "**/e2e/**/*.spec.ts",
      testIgnore: "**/e2e/authenticated/**",
    },
    {
      name: "firefox",
      use: {
        ...devices["Desktop Firefox"],
        // Firefox needs longer timeouts for navigation
        navigationTimeout: 60_000,
        actionTimeout: 15_000,
      },
      testMatch: "**/e2e/**/*.spec.ts",
      testIgnore: "**/e2e/authenticated/**",
    },
  ],

  /* Start both servers before tests; Playwright kills them after */
  webServer: [
    {
      command: "npm run build && npm run start",
      env: { NEXT_PUBLIC_DISABLE_SENTRY: "true" },
      url: "http://localhost:3000",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      // Local PeerJS signaling server — matches NEXT_PUBLIC_PEER_SERVER_* in .env.local
      command: "npm run build && npm start",
      cwd: path.resolve(__dirname, "../../apps/signaling"),
      url: "http://localhost:9000/health",
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
  ],
});
