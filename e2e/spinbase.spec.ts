import { test, expect } from "@playwright/test";

/**
 * End-to-end test: signs in with email/password and verifies /app/spinbase
 * renders the complete dashboard layout.
 *
 * Required env vars:
 *   TEST_EMAIL      — email of a seeded test user
 *   TEST_PASSWORD   — that user's password
 *   PREVIEW_URL     — optional, defaults to http://localhost:8080
 *
 * Run locally with the dev server up:
 *   TEST_EMAIL=you@example.com TEST_PASSWORD=secret bunx playwright test
 *
 * The test skips (does not fail) when credentials are missing so it stays
 * safe to run in CI without leaking secrets.
 */

const email = process.env.TEST_EMAIL;
const password = process.env.TEST_PASSWORD;

test.skip(
  !email || !password,
  "TEST_EMAIL / TEST_PASSWORD not set — skipping signed-in SpinBase E2E",
);

test("signed-in user sees the full SpinBase dashboard", async ({ page }) => {
  // 1) Sign in via the email/password form on /auth
  await page.goto("/auth");
  await page.getByLabel(/email/i).fill(email!);
  await page.getByLabel(/password/i).fill(password!);
  await page.getByRole("button", { name: /sign in|log in|continue/i }).click();

  // 2) Wait for the authenticated shell (nav bar renders after redirect)
  await page.waitForURL(/\/app(\/|$)/, { timeout: 20_000 });

  // 3) Navigate to SpinBase
  await page.goto("/app/spinbase");
  await expect(page).toHaveURL(/\/app\/spinbase$/);

  // 4) Verify each SpinBase dashboard section renders
  //    Head + a11y heading
  await expect(page).toHaveTitle(/SpinBase/i);
  await expect(page.getByRole("heading", { name: /spinbase/i, level: 1 })).toBeVisible();

  //    Brand chip
  await expect(page.getByText(/SpinBase · Base-native/i)).toBeVisible();

  //    Stats grid: XP / Streak / Rank
  await expect(page.getByText(/^XP$/)).toBeVisible();
  await expect(page.getByText(/^Streak$/)).toBeVisible();
  await expect(page.getByText(/^Rank$/)).toBeVisible();

  //    Games tiles
  await expect(page.getByRole("link", { name: /lucky spin/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /coin flip/i })).toBeVisible();

  //    Farcaster share actions
  await expect(page.getByText(/flex on farcaster/i)).toBeVisible();
  await expect(page.getByRole("link", { name: /share score/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /share streak/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /challenge friends/i })).toBeVisible();

  //    Achievements section
  await expect(page.getByText(/^achievements$/i)).toBeVisible();

  //    Navbar shows the SpinBase link
  await expect(page.getByRole("link", { name: /^spinbase$/i })).toBeVisible();
});
