"use client";

import { useId, useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, GitCompareArrows } from "lucide-react";
import { ContributorBadge } from "@/components/companies/contributor-badge";
import {
  computeInlineTextDiff,
  type ClientComparisonRow,
} from "@/lib/client-modification-comparison";
import { cn } from "@/lib/utils";

type ComparisonFilter = "all" | "changed";

type ClientModificationComparisonProps = {
  rows: ClientComparisonRow[];
  title?: string;
};

function renderValueContent(
  row: ClientComparisonRow,
  side: "before" | "after",
  diffHighlight?: ReturnType<typeof computeInlineTextDiff>,
) {
  const contributor =
    side === "before" ? row.beforeContributor : row.afterContributor;
  const text = side === "before" ? row.before : row.after;

  if (contributor) {
    return <ContributorBadge type={contributor} />;
  }

  if (text === "—") {
    return <span className="text-muted">—</span>;
  }

  if (diffHighlight?.partial) {
    const changedSegment =
      side === "before"
        ? diffHighlight.beforeChanged
        : diffHighlight.afterChanged;
    const markClass =
      side === "before"
        ? "rounded bg-rose-500/20 px-0.5 font-semibold text-rose-950 dark:bg-rose-500/30 dark:text-rose-100"
        : "rounded bg-emerald-500/20 px-0.5 font-semibold text-emerald-950 dark:bg-emerald-500/30 dark:text-emerald-100";

    return (
      <span className={cn("break-words", row.mono && "font-mono")}>
        {diffHighlight.prefix}
        {changedSegment ? (
          <mark className={markClass}>{changedSegment}</mark>
        ) : null}
        {diffHighlight.suffix}
      </span>
    );
  }

  return (
    <span className={cn("break-words", row.mono && "font-mono")}>{text}</span>
  );
}

function ChangedFieldCard({ row }: { row: ClientComparisonRow }) {
  const diff = useMemo(
    () =>
      row.beforeContributor || row.afterContributor
        ? undefined
        : computeInlineTextDiff(row.before, row.after),
    [row.after, row.afterContributor, row.before, row.beforeContributor],
  );

  return (
    <article className="rounded-xl border border-border bg-background/50 p-3.5 sm:p-4">
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-card-foreground">
          {row.label}
        </h4>
        <span className="inline-flex items-center rounded-full border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-800 dark:text-amber-300">
          Modificado
        </span>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-stretch sm:gap-2.5">
        <div className="min-w-0 rounded-lg border border-rose-500/20 bg-rose-500/[0.04] px-3 py-2.5 dark:bg-rose-500/[0.07]">
          <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-rose-700 dark:text-rose-300">
            <span
              className="inline-block size-1.5 rounded-full bg-rose-500"
              aria-hidden
            />
            Antes
          </p>
          <div className="min-w-0 text-sm text-card-foreground">
            {renderValueContent(row, "before", diff)}
          </div>
        </div>

        <div
          className="hidden items-center justify-center text-muted sm:flex"
          aria-hidden
        >
          <ArrowRight className="size-4 shrink-0" />
        </div>

        <div className="min-w-0 rounded-lg border border-emerald-500/25 bg-emerald-500/[0.05] px-3 py-2.5 dark:bg-emerald-500/[0.08]">
          <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
            <span
              className="inline-block size-1.5 rounded-full bg-emerald-500"
              aria-hidden
            />
            Después
          </p>
          <div className="min-w-0 text-sm font-medium text-card-foreground">
            {renderValueContent(row, "after", diff)}
          </div>
        </div>
      </div>
    </article>
  );
}

/**
 * Mobile-first diff comparison section highlighting modified client fields
 * above compact unchanged fields, with a quick filter toggle.
 */
export function ClientModificationComparison({
  rows,
  title = "Comparación Antes vs Después",
}: ClientModificationComparisonProps) {
  const headingId = useId();
  const [filter, setFilter] = useState<ComparisonFilter>("all");

  const { changedRows, unchangedRows } = useMemo(() => {
    const changed: ClientComparisonRow[] = [];
    const unchanged: ClientComparisonRow[] = [];
    for (const row of rows) {
      if (row.changed) {
        changed.push(row);
      } else {
        unchanged.push(row);
      }
    }
    return { changedRows: changed, unchangedRows: unchanged };
  }, [rows]);

  const showUnchanged = filter === "all" && unchangedRows.length > 0;

  return (
    <section
      aria-labelledby={headingId}
      className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"
    >
      <div className="flex flex-col gap-3 border-b border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="min-w-0">
          <h3
            id={headingId}
            className="text-sm font-semibold text-card-foreground"
          >
            {title}
          </h3>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
            {changedRows.length > 0 ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/25 bg-amber-500/10 px-2.5 py-0.5 font-medium text-amber-800 dark:text-amber-300">
                <GitCompareArrows className="size-3.5 shrink-0" aria-hidden />
                {changedRows.length}{" "}
                {changedRows.length === 1
                  ? "campo modificado"
                  : "campos modificados"}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-foreground/[0.04] px-2.5 py-0.5 font-medium text-muted">
                <CheckCircle2 className="size-3.5 shrink-0" aria-hidden />
                Sin cambios detectados
              </span>
            )}
            {unchangedRows.length > 0 ? (
              <span className="text-muted">
                {unchangedRows.length} sin cambios
              </span>
            ) : null}
          </div>
        </div>

        <div
          role="group"
          aria-label="Filtrar campos de comparación"
          className="grid w-full grid-cols-2 gap-1 rounded-lg border border-border bg-background/70 p-1 sm:inline-flex sm:w-auto"
        >
          <button
            type="button"
            aria-pressed={filter === "all"}
            onClick={() => setFilter("all")}
            className={cn(
              "min-h-8 rounded-md px-3 py-1 text-xs font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
              filter === "all"
                ? "bg-card text-card-foreground shadow-sm"
                : "text-muted hover:text-foreground",
            )}
          >
            Todos ({rows.length})
          </button>
          <button
            type="button"
            aria-pressed={filter === "changed"}
            onClick={() => setFilter("changed")}
            className={cn(
              "min-h-8 rounded-md px-3 py-1 text-xs font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
              filter === "changed"
                ? "bg-card text-card-foreground shadow-sm"
                : "text-muted hover:text-foreground",
            )}
          >
            Solo cambios ({changedRows.length})
          </button>
        </div>
      </div>

      {changedRows.length > 0 ? (
        <div className="space-y-3 p-4 sm:p-5">
          {showUnchanged ? (
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              Cambios propuestos ({changedRows.length})
            </p>
          ) : null}
          <div className="space-y-3">
            {changedRows.map((row) => (
              <ChangedFieldCard key={row.key} row={row} />
            ))}
          </div>
        </div>
      ) : filter === "changed" ? (
        <div className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center sm:px-5">
          <CheckCircle2 className="size-6 text-muted" aria-hidden />
          <p className="text-sm font-medium text-card-foreground">
            No hay campos modificados
          </p>
          <p className="text-xs text-muted">
            Los valores propuestos coinciden exactamente con los datos actuales.
          </p>
        </div>
      ) : null}

      {showUnchanged ? (
        <div
          className={cn(
            "bg-foreground/[0.015] px-4 py-4 sm:px-5",
            changedRows.length > 0 && "border-t border-border",
          )}
        >
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              Sin cambios ({unchangedRows.length})
            </p>
            <p className="text-xs text-muted">
              Valores idénticos antes y después
            </p>
          </div>
          <dl className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {unchangedRows.map((row) => (
              <div
                key={row.key}
                className={cn(
                  "min-w-0 rounded-lg border border-border/70 bg-card px-3 py-2.5",
                  row.fullWidth && "sm:col-span-2",
                )}
              >
                <dt className="text-[11px] font-medium uppercase tracking-wide text-muted">
                  {row.label}
                </dt>
                <dd className="mt-1 min-w-0 text-sm text-card-foreground">
                  {renderValueContent(row, "before")}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}
    </section>
  );
}
