import {
  CONTRIBUTOR_LABELS,
  CONTRIBUTOR_STYLES,
} from "@/lib/contributor-types";
import type { ContributorType } from "@/types/company";
import { cn } from "@/lib/utils";

export function ContributorBadge({
  type,
  className,
}: {
  type: ContributorType;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-current/15 px-2.5 py-0.5 text-xs font-medium",
        CONTRIBUTOR_STYLES[type],
        className,
      )}
    >
      {CONTRIBUTOR_LABELS[type]}
    </span>
  );
}
