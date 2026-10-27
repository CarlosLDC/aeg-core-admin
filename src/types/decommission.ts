export const DECOMMISSION_REASONS = [
  "DESUSO",
  "SUSTITUCION",
  "PERDIDA",
  "OTRO",
] as const;
export type DecommissionReason = (typeof DECOMMISSION_REASONS)[number];

export type DecommissionRequest = {
  reason: DecommissionReason;
  /** yyyy-MM-dd; si se omite el backend usa la fecha actual. */
  date?: string | null;
  ownPrinter?: boolean;
  notes?: string | null;
};

export type DecommissionResponse = {
  id: number;
  printerId: number;
  date: string;
  reason: DecommissionReason;
  ownPrinter: boolean;
  userId: number | null;
  notes: string | null;
  createdAt: string;
};
