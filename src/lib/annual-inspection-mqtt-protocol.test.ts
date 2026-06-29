import { describe, expect, it } from "vitest";
import {
  ANNUAL_INSPECTION_FLOW_STEPS,
  annualInspectionFlowStepById,
  LIBRO_FISCAL_INSPECTION_WORKFLOW,
} from "@/lib/annual-inspection-mqtt-protocol";

describe("annual-inspection-mqtt-protocol", () => {
  it("defines five MQTT protocol steps", () => {
    expect(ANNUAL_INSPECTION_FLOW_STEPS).toHaveLength(5);
    expect(ANNUAL_INSPECTION_FLOW_STEPS.map((s) => s.step)).toEqual([
      "1",
      "2",
      "3",
      "4",
      "5",
    ]);
  });

  it("documents libro fiscal workflow through save", () => {
    expect(LIBRO_FISCAL_INSPECTION_WORKFLOW).toHaveLength(6);
    expect(LIBRO_FISCAL_INSPECTION_WORKFLOW.at(-1)?.title).toMatch(/Guardar/i);
  });

  it("resolves flow steps by id", () => {
    expect(annualInspectionFlowStepById("sta-inf")?.name).toMatch(/StaInf/i);
    expect(annualInspectionFlowStepById("set-date-rev-o")?.name).toMatch(
      /SetDateRevO/i,
    );
  });
});
