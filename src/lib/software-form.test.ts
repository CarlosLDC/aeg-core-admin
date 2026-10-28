import { describe, expect, it } from "vitest";
import {
  softwareToFormValues,
  toSoftwareRequest,
  INITIAL_SOFTWARE_FORM_VALUES,
} from "./software-form";
import type { SoftwareResponse } from "@/types/software";

describe("software-form", () => {
  it("softwareToFormValues handles empty input", () => {
    expect(softwareToFormValues(null)).toEqual(INITIAL_SOFTWARE_FORM_VALUES);
  });

  it("softwareToFormValues maps full SoftwareResponse", () => {
    const sw: SoftwareResponse = {
      id: 5,
      name: "Saint Enterprise",
      version: "2.1",
      createdAt: "2026-10-27T10:00:00Z",
      programmingLanguages: ["C#", "SQL"],
      operatingSystems: ["Windows"],
      developerCompanyId: 12,
      developerName: "Saint de Venezuela C.A.",
      developerRif: "J-30401878-0",
      external: true,
      distributors: [
        { id: 44, rif: "J-12345678-9", businessName: "Dist Partner 1" },
      ],
    };

    const form = softwareToFormValues(sw);
    expect(form.name).toBe("Saint Enterprise");
    expect(form.version).toBe("2.1");
    expect(form.external).toBe(true);
    expect(form.developerCompanyId).toBe("12");
    expect(form.programmingLanguages).toEqual(["C#", "SQL"]);
    expect(form.operatingSystems).toEqual(["Windows"]);
    expect(form.distributorCompanyIds).toEqual([44]);
  });

  it("toSoftwareRequest rejects empty name", () => {
    const res = toSoftwareRequest({
      ...INITIAL_SOFTWARE_FORM_VALUES,
      name: "   ",
      version: "1.0",
    });
    expect(res).toBe("El nombre del software es obligatorio.");
  });

  it("toSoftwareRequest rejects empty version", () => {
    const res = toSoftwareRequest({
      ...INITIAL_SOFTWARE_FORM_VALUES,
      name: "Saint",
      version: "  ",
    });
    expect(res).toBe("La versión del software es obligatoria.");
  });

  it("toSoftwareRequest produces valid request payload", () => {
    const res = toSoftwareRequest({
      name: "Saint Enterprise  ",
      version: " 1.0 ",
      external: true,
      developerCompanyId: "12",
      programmingLanguages: ["C#", " "],
      operatingSystems: ["Windows", "Linux"],
      distributorCompanyIds: [10, 20],
    });

    expect(typeof res).not.toBe("string");
    if (typeof res !== "string") {
      expect(res.name).toBe("Saint Enterprise");
      expect(res.version).toBe("1.0");
      expect(res.external).toBe(true);
      expect(res.developerCompanyId).toBe(12);
      expect(res.programmingLanguages).toEqual(["C#"]);
      expect(res.operatingSystems).toEqual(["Windows", "Linux"]);
      expect(res.distributorCompanyIds).toEqual([10, 20]);
    }
  });
});
