import { cn } from "@/lib/utils";
import type { Role } from "@/types/user";

export type ToggleTone =
  | "violet"
  | "sky"
  | "amber"
  | "emerald"
  | "rose"
  | "teal"
  | "indigo"
  | "orange"
  | "slate";

const TOGGLE_TONE_ACTIVE: Record<ToggleTone, string> = {
  violet:
    "border-violet-500/35 bg-violet-500/10 text-violet-700 dark:text-violet-300",
  sky: "border-sky-500/35 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  amber:
    "border-amber-500/35 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  emerald:
    "border-emerald-500/35 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  rose: "border-rose-500/35 bg-rose-500/10 text-rose-700 dark:text-rose-300",
  teal: "border-teal-500/35 bg-teal-500/10 text-teal-700 dark:text-teal-300",
  indigo:
    "border-indigo-500/35 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300",
  orange:
    "border-orange-500/35 bg-orange-500/10 text-orange-700 dark:text-orange-300",
  slate:
    "border-slate-500/35 bg-slate-500/10 text-slate-700 dark:text-slate-300",
};

const TOGGLE_CARD_ACTIVE: Record<ToggleTone, string> = {
  violet:
    "border-violet-500/35 bg-violet-500/5 shadow-[0_0_0_1px_rgba(139,92,246,0.15)]",
  sky: "border-sky-500/35 bg-sky-500/5 shadow-[0_0_0_1px_rgba(14,165,233,0.15)]",
  amber:
    "border-amber-500/35 bg-amber-500/5 shadow-[0_0_0_1px_rgba(245,158,11,0.15)]",
  emerald:
    "border-emerald-500/35 bg-emerald-500/5 shadow-[0_0_0_1px_rgba(16,185,129,0.15)]",
  rose: "border-rose-500/35 bg-rose-500/5 shadow-[0_0_0_1px_rgba(244,63,94,0.15)]",
  teal: "border-teal-500/35 bg-teal-500/5 shadow-[0_0_0_1px_rgba(20,184,166,0.15)]",
  indigo:
    "border-indigo-500/35 bg-indigo-500/5 shadow-[0_0_0_1px_rgba(99,102,241,0.15)]",
  orange:
    "border-orange-500/35 bg-orange-500/5 shadow-[0_0_0_1px_rgba(249,115,22,0.15)]",
  slate:
    "border-slate-500/35 bg-slate-500/5 shadow-[0_0_0_1px_rgba(100,116,139,0.15)]",
};

const TOGGLE_CARD_ACCENT: Record<ToggleTone, string> = {
  violet: "text-violet-600 dark:text-violet-300",
  sky: "text-sky-600 dark:text-sky-300",
  amber: "text-amber-600 dark:text-amber-300",
  emerald: "text-emerald-600 dark:text-emerald-300",
  rose: "text-rose-600 dark:text-rose-300",
  teal: "text-teal-600 dark:text-teal-300",
  indigo: "text-indigo-600 dark:text-indigo-300",
  orange: "text-orange-600 dark:text-orange-300",
  slate: "text-slate-600 dark:text-slate-300",
};

const TOGGLE_CARD_DOT: Record<ToggleTone, string> = {
  violet: "bg-violet-500/80",
  sky: "bg-sky-500/80",
  amber: "bg-amber-500/80",
  emerald: "bg-emerald-500/80",
  rose: "bg-rose-500/80",
  teal: "bg-teal-500/80",
  indigo: "bg-indigo-500/80",
  orange: "bg-orange-500/80",
  slate: "bg-slate-500/80",
};

const TOGGLE_CARD_BAR: Record<ToggleTone, string> = {
  violet: "bg-violet-500/70",
  sky: "bg-sky-500/70",
  amber: "bg-amber-500/70",
  emerald: "bg-emerald-500/70",
  rose: "bg-rose-500/70",
  teal: "bg-teal-500/70",
  indigo: "bg-indigo-500/70",
  orange: "bg-orange-500/70",
  slate: "bg-slate-500/70",
};

const TOGGLE_TONE_SEQUENCE: ToggleTone[] = [
  "indigo",
  "teal",
  "violet",
  "amber",
  "emerald",
  "sky",
  "rose",
  "orange",
];

export const TOGGLE_BUTTON_INACTIVE =
  "border-border bg-background text-muted hover:bg-foreground/5 hover:text-card-foreground";

export const TOGGLE_BUTTON_BASE =
  "inline-flex items-center rounded-lg border px-3 py-2 text-sm font-medium transition-colors";

export const TOGGLE_BUTTON_DISABLED =
  "disabled:cursor-not-allowed disabled:opacity-50";

export const TOGGLE_CARD_INACTIVE =
  "border-border bg-background hover:border-border/80 hover:bg-muted/20";

export const BRANCH_ROLE_TOGGLE_TONE = {
  isDistributor: "violet",
  isClient: "sky",
  isServiceCenter: "amber",
  isHeadquarters: "emerald",
} as const satisfies Record<string, ToggleTone>;

export const USER_ROLE_TOGGLE_TONE: Record<Role, ToggleTone> = {
  ADMIN: "violet",
  DISTRIBUTOR: "sky",
  TECHNICIAN: "emerald",
  SERVICE_CENTER: "amber",
};

export const META_COLUMN_TOGGLE_TONE: Record<string, ToggleTone> = {
  id: "indigo",
  createdAt: "teal",
  updatedAt: "rose",
};

export const CONTRACT_TAB_ACTIVE: Record<string, string> = {
  distributor: "bg-violet-600 text-white shadow-sm",
  serviceCenter: "bg-amber-600 text-white shadow-sm",
};

export function toggleToneByIndex(index: number): ToggleTone {
  return TOGGLE_TONE_SEQUENCE[index % TOGGLE_TONE_SEQUENCE.length];
}

export function toggleButtonClass(
  active: boolean,
  tone: ToggleTone,
  options?: { className?: string; disabled?: boolean },
): string {
  return cn(
    TOGGLE_BUTTON_BASE,
    options?.disabled && TOGGLE_BUTTON_DISABLED,
    active ? TOGGLE_TONE_ACTIVE[tone] : TOGGLE_BUTTON_INACTIVE,
    options?.className,
  );
}

export function toggleCardActiveClass(tone: ToggleTone): string {
  return TOGGLE_CARD_ACTIVE[tone];
}

export function toggleCardAccentClass(tone: ToggleTone): string {
  return TOGGLE_CARD_ACCENT[tone];
}

export function toggleCardDotClass(tone: ToggleTone): string {
  return TOGGLE_CARD_DOT[tone];
}

export function toggleCardBarClass(tone: ToggleTone): string {
  return TOGGLE_CARD_BAR[tone];
}

export function tabToggleClass(
  active: boolean,
  tabKey: keyof typeof CONTRACT_TAB_ACTIVE,
  baseClass: string,
): string {
  return cn(
    baseClass,
    active
      ? CONTRACT_TAB_ACTIVE[tabKey]
      : "text-muted hover:bg-foreground/5 hover:text-foreground",
  );
}
