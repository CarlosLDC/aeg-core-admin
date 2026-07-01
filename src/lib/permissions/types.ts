import type { Role } from "@/types/user";

export const ACTIONS = [
  "read",
  "create",
  "update",
  "delete",
  "assignRoles",
] as const;

export type Action = (typeof ACTIONS)[number];

export const RESOURCES = [
  "dashboard",
  "companies",
  "branches",
  "printers",
  "printerModels",
  "seals",
  "technicalServices",
  "annualInspections",
  "contracts",
  "users",
  "clientTransfers",
  "remoto",
  "seniatExtract",
  "uploads",
] as const;

export type Resource = (typeof RESOURCES)[number];

export type PermissionMatrix = Record<
  Resource,
  Partial<Record<Action, readonly Role[]>>
>;

export type PermissionContext = {
  role: Role;
};
