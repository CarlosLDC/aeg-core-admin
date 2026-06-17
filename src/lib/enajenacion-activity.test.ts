import { describe, expect, it } from "vitest";
import {
  activityResultLabel,
  directionLabel,
  filterActivityByMac,
  normalizeMacFilter,
} from "@/lib/enajenacion-activity";
import type { EnajenacionActivityEntry } from "@/types/mqtt";

function entry(mac: string): EnajenacionActivityEntry {
  return {
    id: mac,
    at: "2026-06-17T10:00:00Z",
    mac,
    printerId: 1,
    ptrReg: "GRA0000017",
    direction: "INBOUND",
    topic: "/topic",
    payload: "{}",
    result: "RECEIVED",
    detail: null,
    sessionState: null,
  };
}

describe("enajenacion-activity", () => {
  it("normalizes mac filters", () => {
    expect(normalizeMacFilter("20:6E:F1:88:4C:68")).toBe("206EF1884C68");
  });

  it("filters activity entries by mac", () => {
    const entries = [entry("206EF1884C68"), entry("AABBCCDDEEFF")];
    const filtered = filterActivityByMac(entries, "20:6E:F1:88:4C:68");
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.mac).toBe("206EF1884C68");
  });

  it("labels directions and results in Spanish", () => {
    expect(directionLabel("INBOUND")).toBe("Entrada");
    expect(directionLabel("OUTBOUND")).toBe("Salida");
    expect(directionLabel(null)).toBe("Sesión");
    expect(activityResultLabel("PROCESSED")).toBe("Procesado");
    expect(activityResultLabel("FAILED")).toBe("Fallido");
  });
});
