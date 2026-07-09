"use client";

import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { TruncatedText } from "@/components/ui/truncated-text";
import { cn } from "@/lib/utils";

type ResourceViewShellProps = {
  backHref?: string;
  backLabel?: string;
  title?: string;
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
      {backHref ? (
        <div
          className={cn(
            "sticky top-14 z-20 -mx-3 bg-background/95 px-3 py-2 backdrop-blur-md supports-[backdrop-filter]:bg-background/80",
            "sm:-mx-6 sm:px-6 sm:top-16 lg:-mx-8 lg:px-8",
          )}
        >
          <Link
            href={backHref}
            className="inline-flex items-center gap-2 text-sm font-medium text-muted transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" aria-hidden />
            {backLabel ?? "Volver"}
          </Link>
        </div>
      ) : null}

      {title || subtitle || actions ? (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          {title || subtitle ? (
            <div className="min-w-0 flex-1">
              {title ? (
                <h2 className="text-xl font-semibold text-card-foreground">
                  <TruncatedText
                    maxClassName="max-w-full"
                    className="text-xl font-semibold text-card-foreground"
                  >
                    {title}
                  </TruncatedText>
                </h2>
              ) : null}
              {subtitle ? (
                <div
                  className={
                    title ? "mt-1 text-sm text-muted" : "text-sm text-muted"
                  }
                >
                  <TruncatedText
                    maxClassName="max-w-full"
                    className="text-sm text-muted"
                  >
                    {subtitle}
                  </TruncatedText>
                </div>
              ) : null}
            </div>
          ) : null}
          {actions ? <div className="shrink-0">{actions}</div> : null}
        </div>
      ) : null}

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
