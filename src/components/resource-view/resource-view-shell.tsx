"use client";

import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";

type ResourceViewShellProps = {
  backHref: string;
  backLabel: string;
  title: string;
  subtitle?: string;
  loading?: boolean;
  error?: string | null;
  actions?: React.ReactNode;
  children: React.ReactNode;
};

export function ResourceViewShell({
  backHref,
  backLabel,
  title,
  subtitle,
  loading,
  error,
  actions,
  children,
}: ResourceViewShellProps) {
  return (
    <div className="space-y-6">
      <Link
        href={backHref}
        className="inline-flex items-center gap-2 text-sm font-medium text-muted transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {backLabel}
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold text-card-foreground">{title}</h2>
          {subtitle ? (
            <p className="mt-1 text-sm text-muted">{subtitle}</p>
          ) : null}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted">
          <Loader2 className="size-5 animate-spin" />
          Cargando…
        </div>
      ) : error ? (
        <p className="rounded-xl border border-amber-200/80 bg-amber-50/80 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/25 dark:bg-amber-950/40 dark:text-amber-100">
          {error}
        </p>
      ) : (
        children
      )}
    </div>
  );
}
