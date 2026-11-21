import { defineConfig } from "@playwright/test";

// Runs against the built single file served by `vite preview`.
// Uses the installed Google Chrome (present on developer machines and on GitHub Actions runners).
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: { baseURL: "http://localhost:4173", channel: "chrome", viewport: { width: 1440, height: 900 }, acceptDownloads: true },
  webServer: { command: "npx vite preview --port 4173 --strictPort", port: 4173, reuseExistingServer: !process.env.CI },
});
