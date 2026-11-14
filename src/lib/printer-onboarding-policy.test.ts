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

  it("rejects selecting an inventory box that already has 8 printers", () => {
    const boxes = [
      { id: 1, boxNumber: 1, printerCount: 8 },
      { id: 2, boxNumber: 2, printerCount: 4 },
    ];

    expect(
      validatePrinterWizardSection(
        "equipment",
        {
          ...emptyPrinterForm(),
          modelId: "1",
          fiscalSerial: "ABC1234567",
          boxId: "1",
        },
        { inventoryBoxes: boxes },
      ),
    ).toMatch(/8 impresoras y está llena/i);

    expect(
      validatePrinterWizardSection(
        "equipment",
        {
          ...emptyPrinterForm(),
          modelId: "1",
          fiscalSerial: "ABC1234567",
          boxId: "2",
        },
        { inventoryBoxes: boxes },
      ),
    ).toBeNull();

    // Keeping the current box in edit mode is permitted
    expect(
      validatePrinterWizardSection(
        "equipment",
        {
          ...emptyPrinterForm(),
          modelId: "1",
          fiscalSerial: "ABC1234567",
          boxId: "1",
        },
        { inventoryBoxes: boxes, currentBoxId: "1" },
      ),
    ).toBeNull();
  });
});
