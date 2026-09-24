import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// Regression guard: the latest definitions of the two security-definer routines
// callable by signed-in users must keep their in-body authorization checks.
const dir = join(process.cwd(), "supabase/migrations");
const all = readdirSync(dir)
  .sort()
  .map((f) => readFileSync(join(dir, f), "utf8"))
  .join("\n");

function latest(name: string) {
  const re = new RegExp(`CREATE OR REPLACE FUNCTION public\\.${name}\\([\\s\\S]*?\\$\\$;`, "gi");
  const m = all.match(re);
  return m ? m[m.length - 1] : "";
}

describe("security-definer routines", () => {
  it("has_role only answers for the caller (or service role)", () => {
    const d = latest("has_role");
    expect(d).toMatch(/_user_id = auth\.uid\(\)/);
    expect(d).toMatch(/service_role/);
  });
  it("get_leaderboard requires a signed-in caller", () => {
    expect(latest("get_leaderboard")).toMatch(/auth\.uid\(\) IS NOT NULL/);
  });
  it("anon cannot execute them", () => {
    expect(all).toMatch(
      /REVOKE EXECUTE ON FUNCTION public\.has_role\(uuid, app_role\) FROM PUBLIC, anon/,
    );
    expect(all).toMatch(/REVOKE EXECUTE ON FUNCTION public\.get_leaderboard\(\) FROM PUBLIC, anon/);
  });
});
