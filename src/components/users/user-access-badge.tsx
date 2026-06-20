import { userPortalAccessLabel } from "@/lib/user-access";
import { cn } from "@/lib/utils";
import type { Role } from "@/types/user";

const ACCESS_STYLES: Record<Role, string> = {
  ADMIN: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  DISTRIBUTOR: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  TECHNICIAN: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  SERVICE_CENTER: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
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
