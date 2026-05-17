export const SEAL_STATUSES = ["disponible", "en_impresora", "sustituido"] as const;
export type SealStatus = (typeof SEAL_STATUSES)[number];

export const SEAL_COLORS = ["azul", "morado", "verde", "verde_neon"] as const;
export type SealColor = (typeof SEAL_COLORS)[number];

export type SealResponse = {
  id: number;
  printerId: number | null;
  serial: string;
  createdAt: string;
  installationDate: string | null;
  removalDate: string | null;
  color: SealColor;
  status: SealStatus;
};

export type SealRequest = {
  printerId?: number | null;
  serial: string;
  installationDate?: string | null;
  removalDate?: string | null;
  color: SealColor;
  status: SealStatus;
};
