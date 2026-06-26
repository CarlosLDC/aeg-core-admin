import { userPortalAccessLabel } from "@/lib/user-access";
import { cn } from "@/lib/utils";
import type { Role } from "@/types/user";

const ACCESS_STYLES: Record<Role, string> = {
  ADMIN: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  DISTRIBUTOR: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  TECHNICIAN: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  SERVICE_CENTER: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300",
  SENIAT: "bg-slate-500/10 text-slate-700 dark:text-slate-300",
};

export function UserAccessBadge({ role }: { role: Role }) {
  const label = userPortalAccessLabel(role);
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
        ACCESS_STYLES[role],
      )}
      title={label}
    >
      {label}
    </span>
  );
}
