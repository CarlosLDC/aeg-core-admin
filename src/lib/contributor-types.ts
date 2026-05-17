import type { ContributorType } from "@/types/company";

export const CONTRIBUTOR_LABELS: Record<ContributorType, string> = {
  ordinario: "Ordinario",
  especial: "Especial",
  formal: "Formal",
};

export const CONTRIBUTOR_STYLES: Record<ContributorType, string> = {
  ordinario: "bg-slate-500/10 text-slate-700 dark:text-slate-300",
  especial: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  formal: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
};
