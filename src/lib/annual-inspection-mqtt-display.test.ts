import { describe, expect, it } from "vitest";
import {
  formatMqttSetDateRevOAt,
  hasAnnualInspectionMqttAudit,
} from "@/lib/annual-inspection-mqtt-display";

describe("annual-inspection-mqtt-display", () => {
  it("detects mqtt audit fields", () => {
    expect(hasAnnualInspectionMqttAudit({})).toBe(false);
    expect(
      hasAnnualInspectionMqttAudit({
        mqttRegistroImpresora: "GRA0000017",
        mqttSetDateRevOAt: null,
        mqttNumeroFacturaPrueba: null,
      }),
    ).toBe(true);
  });

  it("formats set date rev o timestamp", () => {
    expect(formatMqttSetDateRevOAt(null)).toBe("—");
    expect(formatMqttSetDateRevOAt(1_782_259_200)).toContain("1782259200");
  });
});
