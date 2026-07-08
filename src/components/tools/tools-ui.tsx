"use client";

import Link from "next/link";
import { ChevronRight, Loader2 } from "lucide-react";
import { pageToolbarButtonClass } from "@/components/ui/page-toolbar";
import { cn } from "@/lib/utils";

export const toolsPanelSectionClass =
  "rounded-xl border border-border bg-card p-5 shadow-sm";

const toolsActionButtonDisabledClass =
  "disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100";

/** Base for MQTT action controls — solid/outline buttons, not filter toggles. */
const toolsActionButtonBaseClass = cn(
  pageToolbarButtonClass,
  "border shadow-sm transition-[color,background-color,box-shadow,transform] active:scale-[0.98]",
  toolsActionButtonDisabledClass,
);

export const toolsActionButtonClass = cn(
  toolsActionButtonBaseClass,
  "border-border bg-card text-card-foreground hover:bg-foreground/[0.04]",
);

export const toolsPrimaryButtonClass = cn(
  toolsActionButtonBaseClass,
  "border-transparent bg-accent text-accent-foreground hover:bg-accent/90",
);

export const toolsDangerButtonClass = cn(
  toolsActionButtonBaseClass,
  "border-transparent bg-rose-600 text-white hover:bg-rose-700",
);

export const toolsListItemClass =
  "rounded-lg border border-border bg-background px-3 py-2 transition-colors hover:border-border/80 hover:bg-foreground/[0.03]";

/** List rows that represent a persistent selection (not one-shot actions). */
export function toolsSelectableListItemClass(selected: boolean): string {
  return cn(
    toolsListItemClass,
    "w-full text-left",
    selected
      ? "border-accent/50 bg-accent/[0.06] ring-1 ring-accent/20"
      : "hover:border-border",
  );
}

type ToolsPanelSectionProps = {
  title: string;
  description?: string;
  headerActions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
};

export function ToolsPanelSection({
  title,
  description,
  headerActions,
  children,
  className,
}: ToolsPanelSectionProps) {
  return (
    <section className={cn(toolsPanelSectionClass, className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-card-foreground">{title}</h3>
          {description ? (
            <p className="mt-1 text-sm text-muted">{description}</p>
          ) : null}
        </div>
        {headerActions}
      </div>
      {children ? <div className="mt-4">{children}</div> : null}
    </section>
  );
}

export function ToolsPanelActions({
  children,
  className,
  hint,
}: {
  children: React.ReactNode;
  className?: string;
  hint?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      {hint ? (
        <p className="text-xs text-muted">{hint}</p>
      ) : null}
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

type ToolsActionButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  variant?: "default" | "primary" | "danger";
};

export function ToolsActionButton({
  loading,
  variant = "default",
  children,
  className,
  disabled,
  ...props
}: ToolsActionButtonProps) {
  const variantClass =
    variant === "primary"
      ? toolsPrimaryButtonClass
      : variant === "danger"
        ? toolsDangerButtonClass
        : toolsActionButtonClass;

  return (
    <button
      type="button"
      {...props}
      disabled={disabled || loading}
      className={cn(variantClass, className)}
    >
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
      {children}
    </button>
  );
}

type ToolsNavLinkProps = {
  title: string;
  description: string;
  href: string;
};

export function ToolsNavLink({ title, description, href }: ToolsNavLinkProps) {
  return (
    <Link
      href={href}
      className="group block rounded-xl border border-border bg-card p-5 shadow-sm transition-colors hover:border-accent/40 hover:bg-accent/[0.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
    >
      <p className="font-medium text-card-foreground">{title}</p>
      <p className="mt-1 text-sm text-muted">{description}</p>
      <p className="mt-3 flex items-center gap-1 text-xs font-medium text-accent">
        Abrir
        <ChevronRight className="size-3.5 shrink-0" aria-hidden />
      </p>
    </Link>
  );
}

export function ToolsMacWarning({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
      {children}
    </div>
  );
}
