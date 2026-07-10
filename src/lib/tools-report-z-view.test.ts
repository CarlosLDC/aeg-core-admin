import { describe, expect, it } from "vitest";
import {
  formatToolsReportZCurrency,
  formatToolsReportZFieldValue,
  listToolsReportZExtraFields,
  resolveToolsReportZNumber,
} from "@/lib/tools-report-z-view";

describe("tools-report-z-view", () => {
  it("formats currency values in bolívares", () => {
    expect(formatToolsReportZCurrency(123456)).toBe("Bs. 1.234,56");
  });

  it("formats report Z field values by kind", () => {
    expect(formatToolsReportZFieldValue(42, "number")).toBe("42");
    expect(formatToolsReportZFieldValue("10/07/2026", "text")).toBe(
      "10/07/2026",
    );
    expect(formatToolsReportZFieldValue(500, "currency")).toBe("Bs. 5,00");
  });

  it("resolves report number from payload", () => {
    expect(resolveToolsReportZNumber({ NroRepZ: 125 })).toBe(125);
    expect(resolveToolsReportZNumber({ NroRepZ: "88" })).toBe(88);
    expect(resolveToolsReportZNumber({})).toBeNull();
  });

  it("lists unknown fields as extras", () => {
    expect(
      listToolsReportZExtraFields({
        NroRepZ: 1,
        CampoExtra: "valor",
      }),
    ).toEqual([{ key: "CampoExtra", value: "valor" }]);
  });
});
