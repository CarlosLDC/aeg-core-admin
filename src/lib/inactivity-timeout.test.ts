import { describe, expect, it } from "vitest";
import { warningSecondsRemaining } from "@/lib/inactivity-timeout";

describe("warningSecondsRemaining", () => {
  it("returns whole seconds until the deadline", () => {
    expect(warningSecondsRemaining(61_000, 0)).toBe(61);
    expect(warningSecondsRemaining(61_000, 1_500)).toBe(60);
    expect(warningSecondsRemaining(61_000, 60_500)).toBe(1);
    expect(warningSecondsRemaining(61_000, 61_000)).toBe(0);
    expect(warningSecondsRemaining(61_000, 62_000)).toBe(0);
  });
});
