import type { ContributorType } from "@/types/company";
import type { ToggleTone } from "@/lib/toggle-button-styles";

export const CONTRIBUTOR_LABELS: Record<ContributorType, string> = {
  ordinario: "Ordinario",
  especial: "Especial",
  formal: "Formal",
};

export const CONTRIBUTOR_STYLES: Record<ContributorType, string> = {
  ordinario: "bg-slate-500/10 text-slate-700 dark:text-slate-300",
  especial: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  formal: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
};

export const CONTRIBUTOR_TOGGLE_TONE: Record<ContributorType, ToggleTone> = {
  ordinario: "slate",
  especial: "violet",
  formal: "amber",
};
