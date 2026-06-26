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

export const TOGGLE_BUTTON_INACTIVE =
  "border-border bg-background text-muted hover:bg-foreground/5 hover:text-card-foreground";

export const TOGGLE_BUTTON_BASE =
  "inline-flex items-center rounded-lg border px-3 py-2 text-sm font-medium transition-colors";

export const TOGGLE_BUTTON_DISABLED =
  "disabled:cursor-not-allowed disabled:opacity-50";

/** Active state for filter/toolbar toggles (site primary). */
export const TOGGLE_BUTTON_PRIMARY_ACTIVE =
  "border-accent/35 bg-accent/10 text-accent";

export const TOGGLE_TAB_PRIMARY_ACTIVE =
  "bg-accent text-accent-foreground shadow-sm";

export const TOGGLE_CARD_INACTIVE =
  "border-border bg-background hover:border-border/80 hover:bg-muted/20";

export const BRANCH_ROLE_TOGGLE_TONE = {
  isDistributor: "rose",
  isClient: "sky",
  isServiceCenter: "amber",
} as const satisfies Record<string, ToggleTone>;

export const USER_ROLE_TOGGLE_TONE: Record<Role, ToggleTone> = {
  ADMIN: "violet",
  DISTRIBUTOR: "sky",
  TECHNICIAN: "emerald",
  SERVICE_CENTER: "amber",
  SENIAT: "slate",
};

export const PRINTER_PAID_TOGGLE_TONE = {
  false: "amber",
  true: "emerald",
} as const satisfies Record<"false" | "true", ToggleTone>;

export const SEAL_TAMPERED_TOGGLE_TONE = {
  false: "emerald",
  true: "rose",
} as const satisfies Record<"false" | "true", ToggleTone>;

export const SEGMENTED_TOGGLE_NEUTRAL_ACTIVE =
  "bg-card text-card-foreground shadow-sm ring-1 ring-border/60";

const SEGMENTED_TOGGLE_TONE_ACTIVE: Record<ToggleTone, string> = {
  violet:
    "bg-violet-500/15 text-violet-800 shadow-sm ring-1 ring-violet-500/25 dark:text-violet-200",
  sky: "bg-sky-500/15 text-sky-800 shadow-sm ring-1 ring-sky-500/25 dark:text-sky-200",
  amber:
    "bg-amber-500/15 text-amber-800 shadow-sm ring-1 ring-amber-500/25 dark:text-amber-200",
  emerald:
    "bg-emerald-500/15 text-emerald-800 shadow-sm ring-1 ring-emerald-500/25 dark:text-emerald-200",
  rose: "bg-rose-500/15 text-rose-800 shadow-sm ring-1 ring-rose-500/25 dark:text-rose-200",
  teal: "bg-teal-500/15 text-teal-800 shadow-sm ring-1 ring-teal-500/25 dark:text-teal-200",
  indigo:
    "bg-indigo-500/15 text-indigo-800 shadow-sm ring-1 ring-indigo-500/25 dark:text-indigo-200",
  orange:
    "bg-orange-500/15 text-orange-800 shadow-sm ring-1 ring-orange-500/25 dark:text-orange-200",
  slate:
    "bg-slate-500/15 text-slate-800 shadow-sm ring-1 ring-slate-500/25 dark:text-slate-200",
};

export function segmentedToggleActiveClass(tone?: ToggleTone): string {
  if (!tone) return SEGMENTED_TOGGLE_NEUTRAL_ACTIVE;
  return SEGMENTED_TOGGLE_TONE_ACTIVE[tone];
}

export const FORM_FIELD_HEIGHT_CLASS = "h-10";

/** Altura estándar de textareas de ancho completo (notas, dirección, fallas, etc.). */
export const FORM_FIELD_TEXTAREA_ROWS = 3;

export const formFieldInputClass = `${FORM_FIELD_HEIGHT_CLASS} w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-60`;

export const formFieldTextareaClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-60";

export const formFieldSelectTriggerClass = `flex ${FORM_FIELD_HEIGHT_CLASS} w-full items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 text-left text-sm outline-none transition-shadow focus:border-accent focus:ring-2 focus:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-60`;

export const formFieldSegmentedToggleShellClass = `flex ${FORM_FIELD_HEIGHT_CLASS} w-full rounded-lg border border-border bg-foreground/[0.03] p-1`;

export function filterToggleButtonClass(
  active: boolean,
  options?: { className?: string; disabled?: boolean },
): string {
  return cn(
    TOGGLE_BUTTON_BASE,
    options?.disabled && TOGGLE_BUTTON_DISABLED,
    active ? TOGGLE_BUTTON_PRIMARY_ACTIVE : TOGGLE_BUTTON_INACTIVE,
    options?.className,
  );
}

export function filterTabToggleClass(active: boolean, baseClass: string): string {
  return cn(
    baseClass,
    active
      ? TOGGLE_TAB_PRIMARY_ACTIVE
      : "text-muted hover:bg-foreground/5 hover:text-foreground",
  );
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
