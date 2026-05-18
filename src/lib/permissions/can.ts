import { PERMISSION_MATRIX } from "@/lib/permissions/matrix";
import type { Action, Resource } from "@/lib/permissions/types";
import type { Role } from "@/types/user";

export function can(role: Role, resource: Resource, action: Action): boolean {
  const allowed = PERMISSION_MATRIX[resource]?.[action];
  if (!allowed) return false;
  return allowed.includes(role);
}
