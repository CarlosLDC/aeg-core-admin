import type { ContractKind } from "@/types/contract";

export type ContractFormValues = {
  partyId: string;
  startDate: string;
  endDate: string;
  /** URLs públicas en Vercel Blob (PDF o imágenes). */
  photoUrls: string[];
};

export function parsePhotoUrls(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function photoUrlsToText(urls: string[] | undefined): string {
  return (urls ?? []).join("\n");
}

export function formatContractDate(value: string | undefined): string {
  if (!value) return "—";
  const date = new Date(value.includes("T") ? value : `${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("es-VE", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export type ContractStatus = "active" | "upcoming" | "expired";

export function contractStatus(
  startDate: string,
  endDate: string,
): ContractStatus {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  if (today < start) return "upcoming";
  if (today > end) return "expired";
  return "active";
}

export const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
  active: "Vigente",
  upcoming: "Próximo",
  expired: "Vencido",
};

export const CONTRACT_STATUS_STYLES: Record<ContractStatus, string> = {
  active: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  upcoming: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  expired: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400",
};

export function validateContractForm(
  values: ContractFormValues,
  kind: ContractKind,
): string | null {
  const partyId = Number(values.partyId);
  if (!Number.isFinite(partyId)) {
    return kind === "distributor"
      ? "Selecciona una distribuidora."
      : "Selecciona un centro de servicio.";
  }

  if (!values.startDate.trim()) return "La fecha de inicio es obligatoria.";
  if (!values.endDate.trim()) return "La fecha de fin es obligatoria.";

  if (values.startDate > values.endDate) {
    return "La fecha de fin debe ser posterior o igual a la de inicio.";
  }

  if (values.photoUrls.length === 0) {
    return "Sube al menos un documento del contrato (PDF o imagen).";
  }

  return null;
}

export function toDistributorContractBody(values: ContractFormValues) {
  const error = validateContractForm(values, "distributor");
  if (error) return error;
  return {
    distributorId: Number(values.partyId),
    startDate: values.startDate,
    endDate: values.endDate,
    photoUrls: values.photoUrls,
  };
}

export function toServiceCenterContractBody(values: ContractFormValues) {
  const error = validateContractForm(values, "serviceCenter");
  if (error) return error;
  return {
    serviceCenterId: Number(values.partyId),
    startDate: values.startDate,
    endDate: values.endDate,
    photoUrls: values.photoUrls,
  };
}
