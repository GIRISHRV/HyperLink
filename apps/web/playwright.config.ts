import { defineConfig, devices } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";
import { config as loadEnv } from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.local so E2E_TEST_EMAIL / E2E_TEST_PASSWORD are available to auth.setup.ts
loadEnv({ path: path.resolve(__dirname, ".env.local") });

const authFile = path.join(__dirname, "e2e/.auth/user.json");



export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 4,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  timeout: 30_000,


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
    // 1. Run auth setup once — logs in and saves storageState
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
    },

    // 2. Authenticated tests — reuse saved session, run after setup
    {
      name: "authenticated",
      dependencies: ["setup"],
      use: {
        ...devices["Desktop Chrome"],
        storageState: authFile,
      },
      testMatch: /authenticated\/.*\.spec\.ts/,
    },

    // 3. Unauthenticated tests — existing specs in e2e/ root (no session)
    // Runs on Chromium, Firefox, and WebKit to ensure foundational P2P works everywhere
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      testMatch: /^(?!.*\/authenticated\/).*\.spec\.ts/,
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
      testMatch: /^(?!.*\/authenticated\/).*\.spec\.ts/,
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
      testMatch: /^(?!.*\/authenticated\/).*\.spec\.ts/,
    },
  ],

  /* Start both servers before tests; Playwright kills them after */
  webServer: [
    {
      command: "npm run build && npm run start",
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

