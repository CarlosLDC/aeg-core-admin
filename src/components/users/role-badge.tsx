import { ROLE_LABELS, ROLE_STYLES } from "@/lib/roles";
import type { Role } from "@/types/user";

export function RoleBadge({ role }: { role: Role }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${ROLE_STYLES[role]}`}
      title={role}
    >
      {ROLE_LABELS[role]}
    </span>
  );
}
