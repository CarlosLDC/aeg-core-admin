export const ABNORMALITY_TYPES = [
  "PRECINTO_ALTERADO",
  "PRECINTO_REMOVIDO",
  "MODIFICACION_FUNCIONAL",
  "PERDIDA",
  "OTRA",
] as const;
export type AbnormalityType = (typeof ABNORMALITY_TYPES)[number];

export type AbnormalityOrigin = "INSPECCION" | "SERVICIO" | "MANUAL";

export type AbnormalityRequest = {
  printerId: number;
  type: AbnormalityType;
  detectedAt?: string | null;
  authorized?: boolean;
  description?: string | null;
};

export type AbnormalityResponse = {
  id: number;
  printerId: number;
  type: AbnormalityType;
  detectedAt: string;
  authorized: boolean;
  userId: number | null;
  description: string | null;
  origin: AbnormalityOrigin;
  originId: number | null;
  createdAt: string;
};
