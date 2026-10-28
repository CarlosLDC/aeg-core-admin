import { normalizeRif, RIF_PATTERN } from "@/lib/seniat-extract";
import type { SoftwareRequest, SoftwareResponse } from "@/types/software";

export const COMMON_PROGRAMMING_LANGUAGES = [
  "C#",
  "Visual Basic",
  "PHP",
  "Java",
  "Python",
  "JavaScript",
  "TypeScript",
  "C++",
  "Delphi",
  "Visual FoxPro",
  "SQL",
];

export const COMMON_OPERATING_SYSTEMS = [
  "Windows",
  "Linux",
  "macOS",
  "Android",
  "iOS",
  "Web",
];

export type SoftwareFormValues = {
  name: string;
  version: string;
  external: boolean;
  developerName: string;
  developerRif: string;
  programmingLanguages: string[];
  operatingSystems: string[];
  distributorCompanyIds: number[];
};

export const INITIAL_SOFTWARE_FORM_VALUES: SoftwareFormValues = {
  name: "",
  version: "",
  external: false,
  developerName: "",
  developerRif: "",
  programmingLanguages: [],
  operatingSystems: [],
  distributorCompanyIds: [],
};

export function softwareToFormValues(
  software: SoftwareResponse | null | undefined,
): SoftwareFormValues {
  if (!software) return INITIAL_SOFTWARE_FORM_VALUES;

  return {
    name: software.name ?? "",
    version: software.version ?? "",
    external: Boolean(software.external),
    developerName: software.developerName ?? "",
    developerRif: software.developerRif ?? "",
    programmingLanguages: software.programmingLanguages ?? [],
    operatingSystems: software.operatingSystems ?? [],
    distributorCompanyIds: (software.distributors ?? []).map((d) => d.id),
  };
}

export function toSoftwareRequest(
  values: SoftwareFormValues,
): SoftwareRequest | string {
  const name = values.name.trim();
  if (!name) {
    return "El nombre del software es obligatorio.";
  }

  const version = values.version.trim();
  if (!version) {
    return "La versión del software es obligatoria.";
  }

  const developerName = values.developerName.trim() || null;
  const rawRif = values.developerRif.trim();
  const developerRif = rawRif ? normalizeRif(rawRif) : null;

  if (developerRif && !RIF_PATTERN.test(developerRif)) {
    return "El RIF del desarrollador debe tener formato válido (ej. J-123456789).";
  }

  const programmingLanguages = (values.programmingLanguages || [])
    .map((l) => l.trim())
    .filter(Boolean);

  const operatingSystems = (values.operatingSystems || [])
    .map((o) => o.trim())
    .filter(Boolean);

  return {
    name,
    version,
    external: values.external,
    developerName,
    developerRif,
    programmingLanguages,
    operatingSystems,
    distributorCompanyIds: values.distributorCompanyIds || [],
  };
}
