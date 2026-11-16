import { describe, expect, it } from "vitest";
import {
  calculateContractEndDate,
  pickCurrentContract,
} from "@/lib/contract-form";

describe("pickCurrentContract", () => {
  it("returns null for an empty list", () => {
    expect(pickCurrentContract([])).toBeNull();
  });

  it("prefers an active contract over upcoming and expired", () => {
    const upcoming = { id: 1, startDate: "2099-01-01", endDate: "2099-12-31" };
    const active = { id: 2, startDate: "2020-01-01", endDate: "2090-12-31" };
    const expired = { id: 3, startDate: "2010-01-01", endDate: "2011-12-31" };
    expect(pickCurrentContract([upcoming, expired, active])).toEqual(active);
  });

  it("prefers upcoming over expired when none is active", () => {
    const upcoming = { id: 1, startDate: "2099-01-01", endDate: "2099-12-31" };
    const expired = { id: 2, startDate: "2010-01-01", endDate: "2011-12-31" };
    expect(pickCurrentContract([expired, upcoming])).toEqual(upcoming);
  });

  it("picks the latest end date among equal status", () => {
    const older = { id: 1, startDate: "2020-01-01", endDate: "2030-01-01" };
    const newer = { id: 2, startDate: "2021-01-01", endDate: "2031-01-01" };
    expect(pickCurrentContract([older, newer])).toEqual(newer);
  });
});

describe("calculateContractEndDate", () => {
  it("adds two years to a standard ISO date", () => {
    expect(calculateContractEndDate("2026-11-16")).toBe("2028-11-16");
  });

  it("clamps Feb 29 to Feb 28 in a non-leap target year", () => {
    expect(calculateContractEndDate("2024-02-29")).toBe("2026-02-28");
  });

  it("returns empty string for empty or invalid input", () => {
    expect(calculateContractEndDate("")).toBe("");
    expect(calculateContractEndDate("invalid")).toBe("");
  });
});
