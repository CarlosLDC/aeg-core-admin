import { describe, expect, it } from "vitest";
import { emptyPrinterForm } from "@/lib/printer-form";
import { validatePrinterWizardSection } from "@/lib/printer-onboarding-policy";

describe("validatePrinterWizardSection", () => {
  it("requires model and valid fiscal serial on equipment step", () => {
    expect(
      validatePrinterWizardSection("equipment", emptyPrinterForm()),
    ).toMatch(/modelo/i);
    expect(
      validatePrinterWizardSection("equipment", {
        ...emptyPrinterForm(),
        modelId: "1",
        fiscalSerial: "",
      }),
    ).toMatch(/serial/i);
    expect(
      validatePrinterWizardSection("equipment", {
        ...emptyPrinterForm(),
        modelId: "1",
        fiscalSerial: "BAD",
      }),
    ).toMatch(/serial/i);
    expect(
      validatePrinterWizardSection("equipment", {
        ...emptyPrinterForm(),
        modelId: "1",
        fiscalSerial: "ABC1234567",
      }),
    ).toBeNull();
  });

  it("validates optional technical fields", () => {
    expect(
      validatePrinterWizardSection("technical", {
        ...emptyPrinterForm(),
        versionFirmware: "x",
      }),
    ).toMatch(/firmware/i);
    expect(
      validatePrinterWizardSection("technical", {
        ...emptyPrinterForm(),
        macAddress: "not-a-mac",
      }),
    ).toMatch(/MAC/i);
  });
});
