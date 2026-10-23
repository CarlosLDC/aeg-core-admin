import { describe, expect, it } from "vitest";
import {
  hasValidIpAddress,
  normalizeMacInput,
} from "@/modules/fiscalizacion/use-fiscalizacion-usb-wizard";

describe("fiscalizacion-usb-wizard helpers", () => {
  it("normalizes compact and colon MAC addresses to uppercase colon format", () => {
    expect(normalizeMacInput("206ef1884c68")).toBe("20:6E:F1:88:4C:68");
    expect(normalizeMacInput("20:6e:f1:88:4c:68")).toBe("20:6E:F1:88:4C:68");
    expect(normalizeMacInput("20-6E-F1-88-4C-68")).toBe("20:6E:F1:88:4C:68");
  });

  it("returns null for invalid MAC inputs", () => {
    expect(normalizeMacInput("")).toBeNull();
    expect(normalizeMacInput("20:6E:F1")).toBeNull();
    expect(normalizeMacInput("ZZ:6E:F1:88:4C:68")).toBeNull();
  });

  it("detects valid IP addresses", () => {
    expect(hasValidIpAddress("192.168.1.50")).toBe(true);
    expect(hasValidIpAddress("N/A")).toBe(false);
    expect(hasValidIpAddress("0.0.0.0")).toBe(false);
    expect(hasValidIpAddress("")).toBe(false);
    expect(hasValidIpAddress(null)).toBe(false);
  });
});
