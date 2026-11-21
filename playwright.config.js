import { defineConfig } from "@playwright/test";

// Runs against the built single file served by `vite preview`.
// Locally it uses the installed Google Chrome; in CI `npx playwright install chromium` provides one.
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  use: { baseURL: "http://localhost:4173", channel: process.env.CI ? undefined : "chrome", viewport: { width: 1440, height: 900 }, acceptDownloads: true },
  webServer: { command: "npx vite preview --port 4173 --strictPort", port: 4173, reuseExistingServer: !process.env.CI },
});
