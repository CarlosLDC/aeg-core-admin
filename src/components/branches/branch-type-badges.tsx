import type { BranchWithRoles } from "@/types/branch";
import { cn } from "@/lib/utils";

const TYPES = [
  {
    key: "client" as const,
    label: "Cliente",
    style: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  },
  {
    key: "distributor" as const,
    label: "Distribuidor",
    style: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  },
  {
    key: "serviceCenter" as const,
    label: "Centro servicio",
    style: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
];

function activeRoleKeys(branch: BranchWithRoles) {
  const keys: Array<(typeof TYPES)[number]["key"]> = [];
  if (branch.client) keys.push("client");
  if (branch.distributor) keys.push("distributor");
  if (branch.serviceCenter) keys.push("serviceCenter");
  return keys;
}

export function BranchTypeBadges({ branch }: { branch: BranchWithRoles }) {
  const activeKeys = activeRoleKeys(branch);
  const active = TYPES.filter((t) => activeKeys.includes(t.key));
  if (active.length === 0) {
    return <span className="text-xs text-muted">—</span>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {active.map((t) => (
        <span
          key={t.key}
          className={cn(
            "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
            t.style,
          )}
        >
          {t.label}
        </span>
      ))}
    </div>
  );
}
