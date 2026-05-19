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
        "rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5",
        href &&
          "group transition-colors hover:border-accent/40 hover:bg-accent/[0.02]",
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted">{title}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-card-foreground">
            {value}
          </p>
        </div>
        <div className="flex size-11 items-center justify-center rounded-lg bg-accent/10 text-accent">
          <Icon className="size-5" />
        </div>
      </div>
      {showTrend ? (
        <p
          className={cn(
            "mt-4 flex items-center gap-1 text-sm font-medium",
            trend === "up" ? "text-emerald-600" : "text-rose-600",
          )}
        >
          <TrendIcon className="size-4" />
          {change}
          <span className="font-normal text-muted">vs. mes anterior</span>
        </p>
      ) : hint ? (
        <p className="mt-4 text-sm text-muted">{hint}</p>
      ) : null}
      {href ? (
        <p className="mt-3 flex items-center gap-1 text-xs font-medium text-accent opacity-0 transition-opacity group-hover:opacity-100 sm:opacity-100">
          Ver detalle
          <ChevronRight className="size-3.5" aria-hidden />
        </p>
      ) : null}
    </article>
  );

  if (href) {
    return (
      <Link href={href} className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30">
        {card}
      </Link>
    );
  }

  return card;
}
