"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ChevronRight, Loader2, RefreshCw, WifiOff } from "lucide-react";
import { DetailField } from "@/components/resource-view/detail-fields";
import { pageToolbarButtonClass } from "@/components/ui/page-toolbar";
import type { ToolsSectionTone } from "@/lib/tools-sections";
import type { ToolsPrinterPartySummary } from "@/modules/tools/shared/types";
import { TOOLS_PRINTER_OFFLINE_MESSAGE } from "@/lib/tools-printer-connection";
import { cn } from "@/lib/utils";

const toolsToneBadgeClass: Record<ToolsSectionTone, string> = {
  sky: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  emerald: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  violet: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  amber: "bg-amber-500/15 text-amber-800 dark:text-amber-300",
  indigo: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300",
  teal: "bg-teal-500/15 text-teal-700 dark:text-teal-300",
  rose: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  slate: "bg-slate-500/15 text-slate-700 dark:text-slate-300",
};

const toolsToneHoverBorderClass: Record<ToolsSectionTone, string> = {
  sky: "hover:border-sky-500/35 hover:bg-sky-500/[0.03]",
  emerald: "hover:border-emerald-500/35 hover:bg-emerald-500/[0.03]",
  violet: "hover:border-violet-500/35 hover:bg-violet-500/[0.03]",
  amber: "hover:border-amber-500/35 hover:bg-amber-500/[0.03]",
  indigo: "hover:border-indigo-500/35 hover:bg-indigo-500/[0.03]",
  teal: "hover:border-teal-500/35 hover:bg-teal-500/[0.03]",
  rose: "hover:border-rose-500/35 hover:bg-rose-500/[0.03]",
  slate: "hover:border-slate-500/35 hover:bg-slate-500/[0.03]",
};

export const toolsPanelSectionClass =
  "rounded-xl border border-border bg-card p-5 shadow-sm";

/** Symmetric vertical rhythm inside Tools subsections (heading → content). */
export const toolsSubsectionClass = "admin-content-stack";

export const toolsSurfaceClass =
  "rounded-xl border border-border bg-card shadow-sm";

const toolsActionButtonDisabledClass =
  "disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100";

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

export function toolsSelectableListItemClass(selected: boolean): string {
  return cn(
    toolsListItemClass,
    "w-full text-left",
    selected
      ? "border-accent/50 bg-accent/[0.06] ring-1 ring-accent/20"
      : "hover:border-border",
  );
}

export function ToolsPage({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("admin-content-stack", className)}>{children}</div>;
}

export function ToolsSectionGrid({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 items-stretch gap-3 sm:grid-cols-2 lg:grid-cols-3",
        "[&>*]:h-full",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function ToolsPanelGrid({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3",
        className,
      )}
    >
      {children}
    </div>
  );
}

type ToolsIconBadgeProps = {
  icon: LucideIcon;
  tone: ToolsSectionTone;
  size?: "sm" | "md" | "lg";
  className?: string;
};

export function ToolsIconBadge({
  icon: Icon,
  tone,
  size = "md",
  className,
}: ToolsIconBadgeProps) {
  const sizeClass =
    size === "sm"
      ? "size-9 [&_svg]:size-4"
      : size === "lg"
        ? "size-12 [&_svg]:size-6"
        : "size-10 [&_svg]:size-5";

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-xl",
        sizeClass,
        toolsToneBadgeClass[tone],
        className,
      )}
      aria-hidden
    >
      <Icon />
    </span>
  );
}

export function ToolsSectionHeading({
  icon,
  tone,
  title,
  description,
  actions,
}: {
  icon: LucideIcon;
  tone: ToolsSectionTone;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex min-w-0 items-center gap-3">
        <ToolsIconBadge icon={icon} tone={tone} size="lg" />
        <div className="min-w-0 py-0.5">
          <h2 className="text-lg font-semibold tracking-tight text-card-foreground">
            {title}
          </h2>
          {description ? (
            <p className="mt-1 max-w-2xl text-sm text-muted">{description}</p>
          ) : null}
        </div>
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
  );
}

export function ToolsNavCard({
  href,
  icon,
  tone,
  title,
  description,
  disabled = false,
}: {
  href: string;
  icon: LucideIcon;
  tone: ToolsSectionTone;
  title: string;
  description: string;
  disabled?: boolean;
}) {
  const className = cn(
    "group relative z-0 flex h-full min-h-[10.25rem] flex-col rounded-xl border border-border bg-card p-4 shadow-sm transition-colors",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30",
    disabled && "cursor-not-allowed opacity-50",
    toolsToneHoverBorderClass[tone],
  );
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <ToolsIconBadge icon={icon} tone={tone} />
        <ChevronRight
          className="size-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-foreground"
          aria-hidden
        />
      </div>
      <div className="mt-4 flex min-h-0 flex-1 flex-col">
        <p className="font-medium text-card-foreground">{title}</p>
        <p className="mt-1 line-clamp-2 min-h-[2.5rem] flex-1 text-sm leading-snug text-muted">
          {description}
        </p>
      </div>
    </>
  );

  if (disabled) {
    return (
      <div aria-disabled="true" className={className}>
        {content}
      </div>
    );
  }

  return (
    <Link href={href} className={className}>
      {content}
    </Link>
  );
}

export function ToolsActionCard({
  icon,
  tone,
  title,
  description,
  onClick,
  disabled,
  loading,
}: {
  icon: LucideIcon;
  tone: ToolsSectionTone;
  title: string;
  description: string;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        "group relative z-0 flex h-full min-h-[10.25rem] w-full flex-col rounded-xl border border-border bg-card p-4 text-left shadow-sm transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30",
        "disabled:cursor-not-allowed disabled:opacity-50",
        toolsToneHoverBorderClass[tone],
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <ToolsIconBadge icon={icon} tone={tone} />
        {loading ? (
          <Loader2
            className="size-4 shrink-0 animate-spin text-muted"
            aria-hidden
          />
        ) : (
          <ChevronRight
            className="size-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-foreground"
            aria-hidden
          />
        )}
      </div>
      <div className="mt-4 flex min-h-0 flex-1 flex-col">
        <p className="font-medium text-card-foreground">{title}</p>
        <p className="mt-1 line-clamp-2 min-h-[2.5rem] flex-1 text-sm leading-snug text-muted">
          {description}
        </p>
      </div>
    </button>
  );
}

/** @deprecated Use ToolsNavCard */
export function ToolsNavLink({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href: string;
}) {
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

export function ToolsDetailFields({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <dl className={cn("grid min-w-0 gap-4 sm:grid-cols-2", className)}>
      {children}
    </dl>
  );
}

export function ToolsPartyInfoFields({
  party,
}: {
  party: ToolsPrinterPartySummary;
}) {
  return (
    <ToolsDetailFields>
      <DetailField label="Nombre" value={party.name} />
      <DetailField label="RIF" value={party.rif || "—"} mono />
      <DetailField label="Teléfono" value={party.phone} />
      <DetailField label="Email" value={party.email} />
    </ToolsDetailFields>
  );
}

export function ToolsMetricCard({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className={cn(toolsSurfaceClass, "p-4")}>
      <p className="text-xs font-medium uppercase tracking-wide text-muted">
        {label}
      </p>
      <p
        className={cn(
          "mt-2 text-sm font-medium text-card-foreground",
          mono && "font-mono text-xs",
        )}
      >
        {value}
      </p>
    </div>
  );
}

type ToolsPanelSectionProps = {
  title: string;
  description?: string;
  icon?: LucideIcon;
  tone?: ToolsSectionTone;
  headerActions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  contentClassName?: string;
};

export function ToolsPanelSection({
  title,
  description,
  icon,
  tone = "slate",
  headerActions,
  children,
  className,
  contentClassName,
}: ToolsPanelSectionProps) {
  return (
    <section className={cn(toolsPanelSectionClass, className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          {icon ? <ToolsIconBadge icon={icon} tone={tone} size="sm" /> : null}
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-card-foreground">
              {title}
            </h3>
            {description ? (
              <p className="mt-1 text-sm text-muted">{description}</p>
            ) : null}
          </div>
        </div>
        {headerActions}
      </div>
      {children ? (
        <div className={cn("mt-4", contentClassName)}>{children}</div>
      ) : null}
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
      {hint ? <p className="text-xs text-muted">{hint}</p> : null}
      <ToolsSectionGrid>{children}</ToolsSectionGrid>
    </div>
  );
}

type ToolsActionTileProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  variant?: "default" | "primary" | "danger";
  label: string;
  icon?: LucideIcon;
  tone?: ToolsSectionTone;
};

export function ToolsActionTile({
  loading,
  variant = "default",
  label,
  icon,
  tone = "slate",
  className,
  disabled,
  ...props
}: ToolsActionTileProps) {
  const Icon = icon;
  const variantClass =
    variant === "primary"
      ? "border-accent/30 bg-accent/[0.04] hover:border-accent/45 hover:bg-accent/[0.08]"
      : variant === "danger"
        ? "border-rose-500/30 bg-rose-500/[0.04] hover:border-rose-500/45 hover:bg-rose-500/[0.08]"
        : cn("border-border bg-background hover:bg-foreground/[0.03]", toolsToneHoverBorderClass[tone]);

  return (
    <button
      type="button"
      {...props}
      disabled={disabled || loading}
      className={cn(
        "flex min-h-[5.5rem] flex-col items-start justify-between gap-3 rounded-xl border p-4 text-left shadow-sm transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-50",
        variantClass,
        className,
      )}
    >
      <div className="flex w-full items-start justify-between gap-2">
        {Icon ? <ToolsIconBadge icon={Icon} tone={tone} size="sm" /> : <span />}
        {loading ? (
          <Loader2 className="size-4 shrink-0 animate-spin text-muted" aria-hidden />
        ) : null}
      </div>
      <span className="text-sm font-medium leading-snug text-card-foreground">
        {label}
      </span>
    </button>
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

export type ToolsRefreshStatusControl = {
  loading: boolean;
  refreshStatus: () => void | Promise<void>;
  mqttReady: boolean;
};

export function ToolsRefreshStatusButton({
  loading,
  onRefresh,
  disabled,
  className,
}: {
  loading: boolean;
  onRefresh: () => void | Promise<void>;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <ToolsActionButton
      loading={loading}
      disabled={disabled}
      onClick={() => void onRefresh()}
      className={className}
    >
      {!loading ? <RefreshCw className="size-4" aria-hidden /> : null}
      Actualizar estado
    </ToolsActionButton>
  );
}

export function ToolsSectionStatusActions({
  statusRefresh,
  children,
}: {
  statusRefresh?: ToolsRefreshStatusControl | null;
  children?: React.ReactNode;
}) {
  const showRefresh = statusRefresh?.mqttReady ?? false;
  if (!showRefresh && !children) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {children}
      {showRefresh ? (
        <ToolsRefreshStatusButton
          loading={statusRefresh.loading}
          onRefresh={statusRefresh.refreshStatus}
        />
      ) : null}
    </div>
  );
}

export function ToolsMacWarning({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
      {children}
    </div>
  );
}

export function ToolsConnectionWarning({
  children = TOOLS_PRINTER_OFFLINE_MESSAGE,
}: {
  children?: React.ReactNode;
}) {
  return (
    <div
      role="status"
      className="flex items-start gap-3 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-800 dark:text-rose-200"
    >
      <WifiOff className="mt-0.5 size-4 shrink-0" aria-hidden />
      <p>{children}</p>
    </div>
  );
}
