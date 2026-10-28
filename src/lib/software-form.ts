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
  developerCompanyId: string;
  programmingLanguages: string[];
  operatingSystems: string[];
  distributorCompanyIds: number[];
};

export const INITIAL_SOFTWARE_FORM_VALUES: SoftwareFormValues = {
  name: "",
  version: "",
  external: false,
  developerCompanyId: "",
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
    developerCompanyId: software.developerCompanyId != null ? String(software.developerCompanyId) : "",
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

  const developerCompanyId = values.developerCompanyId.trim()
    ? Number(values.developerCompanyId)
    : null;

  if (values.developerCompanyId.trim() && Number.isNaN(developerCompanyId)) {
    return "La empresa desarrolladora seleccionada no es válida.";
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
    developerCompanyId,
    programmingLanguages,
    operatingSystems,
    distributorCompanyIds: values.distributorCompanyIds || [],
  };
}
