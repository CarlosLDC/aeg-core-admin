import { describe, expect, it } from "vitest";
import {
  CURRENT_FIRMWARE_VERSION,
  compareFirmwareVersions,
  isFirmwareUpdateRequired,
} from "./firmware-update-policy";

describe("firmware-update-policy", () => {
  it("has current version as 1.1.2", () => {
    expect(CURRENT_FIRMWARE_VERSION).toBe("1.1.2");
  });

  describe("compareFirmwareVersions", () => {
    it("compares equal versions correctly", () => {
      expect(compareFirmwareVersions("1.1.2", "1.1.2")).toBe(0);
      expect(compareFirmwareVersions("1.0.0", "1.0.0")).toBe(0);
    });

    it("identifies older versions", () => {
      expect(compareFirmwareVersions("1.1.0", "1.1.2")).toBeLessThan(0);
      expect(compareFirmwareVersions("1.0.9", "1.1.0")).toBeLessThan(0);
      expect(compareFirmwareVersions("1.1.1", "1.1.2")).toBeLessThan(0);
    });

    it("identifies newer versions", () => {
      expect(compareFirmwareVersions("1.2.0", "1.1.2")).toBeGreaterThan(0);
      expect(compareFirmwareVersions("2.0.0", "1.1.2")).toBeGreaterThan(0);
      expect(compareFirmwareVersions("1.1.3", "1.1.2")).toBeGreaterThan(0);
    });
  });

  describe("isFirmwareUpdateRequired", () => {
    it("returns true for null, undefined or empty firmware", () => {
      expect(isFirmwareUpdateRequired(null)).toBe(true);
      expect(isFirmwareUpdateRequired(undefined)).toBe(true);
      expect(isFirmwareUpdateRequired("")).toBe(true);
      expect(isFirmwareUpdateRequired("   ")).toBe(true);
    });

    it("returns true for firmware versions lower than current", () => {
      expect(isFirmwareUpdateRequired("1.1.0")).toBe(true);
      expect(isFirmwareUpdateRequired("1.1.1")).toBe(true);
      expect(isFirmwareUpdateRequired("1.0.0")).toBe(true);
    });

    it("returns false for current and higher firmware versions", () => {
      expect(isFirmwareUpdateRequired("1.1.2")).toBe(false);
      expect(isFirmwareUpdateRequired("1.1.3")).toBe(false);
      expect(isFirmwareUpdateRequired("1.2.0")).toBe(false);
    });
  });
});
