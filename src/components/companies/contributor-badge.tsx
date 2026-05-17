import {
  CONTRIBUTOR_LABELS,
  CONTRIBUTOR_STYLES,
} from "@/lib/contributor-types";
import type { ContributorType } from "@/types/company";

export function ContributorBadge({ type }: { type: ContributorType }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${CONTRIBUTOR_STYLES[type]}`}
    >
      {CONTRIBUTOR_LABELS[type]}
    </span>
  );
}
