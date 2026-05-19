import Link from "next/link";
import { ChevronRight, type LucideIcon, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

type StatCardProps = {
  title: string;
  value: string;
  icon: LucideIcon;
  hint?: string;
  change?: string;
  trend?: "up" | "down";
  href?: string;
};

export function StatCard({
  title,
  value,
  icon: Icon,
  hint,
  change,
  trend,
  href,
}: StatCardProps) {
  const TrendIcon = trend === "up" ? TrendingUp : TrendingDown;
  const showTrend = change != null && trend != null;

  const card = (
    <article
      className={cn(
        "flex h-full min-h-[10.5rem] flex-col rounded-xl border border-border bg-card p-4 shadow-sm sm:min-h-[11rem] sm:p-5",
        href &&
          "group transition-colors hover:border-accent/40 hover:bg-accent/[0.02]",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-muted">{title}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-card-foreground tabular-nums">
            {value}
          </p>
        </div>
        <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
          <Icon className="size-5" aria-hidden />
        </div>
      </div>

      <div className="mt-auto space-y-3 pt-4">
        <div className="min-h-[2.75rem] text-sm leading-snug">
          {showTrend ? (
            <p
              className={cn(
                "flex flex-wrap items-center gap-x-1 gap-y-0.5 font-medium",
                trend === "up" ? "text-emerald-600" : "text-rose-600",
              )}
            >
              <TrendIcon className="size-4 shrink-0" aria-hidden />
              <span>{change}</span>
              <span className="font-normal text-muted">vs. mes anterior</span>
            </p>
          ) : hint ? (
            <p className="line-clamp-2 text-muted">{hint}</p>
          ) : (
            <span className="sr-only">Sin detalle adicional</span>
          )}
        </div>
        {href ? (
          <p className="flex items-center gap-1 text-xs font-medium text-accent">
            Ver detalle
            <ChevronRight className="size-3.5 shrink-0" aria-hidden />
          </p>
        ) : null}
      </div>
    </article>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="block h-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
      >
        {card}
      </Link>
    );
  }

  return card;
}
