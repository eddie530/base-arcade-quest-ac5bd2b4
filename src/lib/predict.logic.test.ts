import { describe, expect, it } from "vitest";
import { isMarketOpen, predictXp } from "./predict.logic";

describe("PredictX rewards", () => {
  it("wrong call pays 0 XP", () => expect(predictXp(false, 4)).toBe(0));
  it("first correct call pays 50 XP", () => expect(predictXp(true, 0)).toBe(50));
  it("streak adds 10 XP per step", () => expect(predictXp(true, 3)).toBe(80));
  it("streak bonus caps at 100 XP", () => expect(predictXp(true, 20)).toBe(100));
  it("closed or resolved markets reject picks", () => {
    const now = new Date("2026-10-14T12:00:00Z");
    expect(isMarketOpen({ closes_at: "2026-10-14T11:00:00Z", resolution: null }, now)).toBe(false);
    expect(isMarketOpen({ closes_at: "2026-10-15T11:00:00Z", resolution: "yes" }, now)).toBe(false);
    expect(isMarketOpen({ closes_at: "2026-10-15T11:00:00Z", resolution: null }, now)).toBe(true);
  });
});
