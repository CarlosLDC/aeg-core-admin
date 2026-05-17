export const NOTIFICATION_KINDS = [
  "printer",
  "company",
  "branch",
  "employee",
  "seal",
  "technical_service",
  "annual_inspection",
  "contract",
  "printer_model",
  "system",
] as const;

export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

export type AppNotification = {
  id: string;
  kind: NotificationKind;
  title: string;
  message: string;
  href: string | null;
  createdAt: string;
  sortKey: number;
};
