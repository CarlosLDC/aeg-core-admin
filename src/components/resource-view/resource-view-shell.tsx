"use client";

import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { TruncatedText } from "@/components/ui/truncated-text";

type ResourceViewShellProps = {
  backHref?: string;
  backLabel?: string;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  titleBadge?: React.ReactNode;
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
  titleBadge,
  loading,
  error,
  actions,
  children,
}: ResourceViewShellProps) {
  return (
    <div className="admin-content-stack">
      {backHref ? (
        <Link
          href={backHref}
          className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4 shrink-0" aria-hidden />
          {backLabel ?? "Volver"}
        </Link>
      ) : null}

      {title || subtitle || titleBadge || actions ? (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {title || subtitle || titleBadge ? (
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
              <div className="min-w-0">
                {title ? (
                  <h2 className="text-xl font-semibold text-card-foreground">
                    {typeof title === "string" ? (
                      <TruncatedText
                        maxClassName="max-w-full"
                        className="text-xl font-semibold text-card-foreground"
                      >
                        {title}
                      </TruncatedText>
                    ) : (
                      title
                    )}
                  </h2>
                ) : null}
                {subtitle ? (
                  <div
                    className={
                      title ? "mt-1 text-sm text-muted" : "text-sm text-muted"
                    }
                  >
                    {typeof subtitle === "string" ? (
                      <TruncatedText
                        maxClassName="max-w-full"
                        className="text-sm text-muted"
                      >
                        {subtitle}
                      </TruncatedText>
                    ) : (
                      subtitle
                    )}
                  </div>
                ) : null}
              </div>
              {titleBadge ? <div className="shrink-0">{titleBadge}</div> : null}
            </div>
          ) : null}
          {actions ? <div className="shrink-0 flex items-center">{actions}</div> : null}
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
