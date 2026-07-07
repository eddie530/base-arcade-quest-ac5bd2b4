import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  fullyParallel: false,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: process.env.PREVIEW_URL ?? "http://localhost:8080",
    headless: true,
    viewport: { width: 1280, height: 1800 },
    screenshot: "only-on-failure",
  },
});