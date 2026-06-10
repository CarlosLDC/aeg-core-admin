"use client";

import { useMemo, useState } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { formatMoney } from "@/lib/datetime-form";
import type { MonthlySalesBucket } from "@/lib/dashboard-data";
import { cn } from "@/lib/utils";

type DistributorSalesChartProps = {
  data: MonthlySalesBucket[];
  className?: string;
};

function salesTrend(data: MonthlySalesBucket[]): {
  delta: number;
  label: string;
} | null {
  if (data.length < 2) return null;
  const prev = data[data.length - 2]?.count ?? 0;
  const last = data[data.length - 1]?.count ?? 0;
  if (prev === 0 && last === 0) return null;
  const delta =
    prev === 0 ? (last > 0 ? 100 : 0) : Math.round(((last - prev) / prev) * 100);
  return { delta, label: data[data.length - 2]?.label ?? "" };
}

export function DistributorSalesChart({
  data,
  className,
}: DistributorSalesChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const totalSales = useMemo(
    () => data.reduce((sum, month) => sum + month.count, 0),
    [data],
  );
  const totalRevenue = useMemo(
    () => data.reduce((sum, month) => sum + month.revenue, 0),
    [data],
  );
  const trend = useMemo(() => salesTrend(data), [data]);
  const maxCount = Math.max(1, ...data.map((month) => month.count));
  const hasSales = totalSales > 0;

  const width = 720;
  const height = 240;
  const padLeft = 40;
  const padRight = 16;
  const padTop = 20;
  const padBottom = 32;
  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;
  const barGap = 8;
  const barW = Math.max(
    12,
    (chartW - barGap * Math.max(data.length - 1, 0)) / Math.max(data.length, 1),
  );

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => ({
    t,
    value: Math.round(maxCount * t),
    y: padTop + chartH * (1 - t),
  }));

  const hovered = hoveredIndex != null ? data[hoveredIndex] : null;
  const hoveredX =
    hoveredIndex != null
      ? padLeft +
        hoveredIndex * (barW + barGap) +
        barW / 2
      : null;

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6",
        className,
      )}
    >
      <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-card-foreground">
            Ventas en el tiempo
          </h2>
          <p className="mt-0.5 text-sm text-muted">
            Enajenaciones de impresoras fiscales por mes
          </p>
        </div>
        <dl className="flex flex-wrap gap-4 sm:gap-6 sm:text-right">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted">
              Total (12 meses)
            </dt>
            <dd className="text-2xl font-semibold tabular-nums text-card-foreground">
              {totalSales}
            </dd>
          </div>
          {totalRevenue > 0 ? (
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted">
                Facturado
              </dt>
              <dd className="text-2xl font-semibold tabular-nums text-card-foreground">
                {formatMoney(totalRevenue)}
              </dd>
            </div>
          ) : null}
          {trend ? (
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted">
                vs. {trend.label}
              </dt>
              <dd
                className={cn(
                  "inline-flex items-center justify-end gap-1 text-lg font-semibold tabular-nums",
                  trend.delta >= 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400",
                )}
              >
                {trend.delta >= 0 ? (
                  <TrendingUp className="size-4" aria-hidden />
                ) : (
                  <TrendingDown className="size-4" aria-hidden />
                )}
                {trend.delta >= 0 ? "+" : ""}
                {trend.delta}%
              </dd>
            </div>
          ) : null}
        </dl>
      </div>

      {!hasSales ? (
        <div className="mt-6 flex h-56 items-center justify-center rounded-lg border border-dashed border-border bg-foreground/[0.02]">
          <EmptyState
            compact
            className="py-8"
            title="Sin ventas registradas"
            description="Las enajenaciones de los últimos 12 meses aparecerán aquí."
          />
        </div>
      ) : (
        <div className="relative mt-6 w-full">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="h-auto w-full"
            preserveAspectRatio="xMidYMid meet"
            onMouseLeave={() => setHoveredIndex(null)}
            role="img"
            aria-label="Histograma de ventas mensuales"
          >
            <defs>
              <linearGradient id="sales-bar-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fb923c" />
                <stop offset="100%" stopColor="#ea580c" />
              </linearGradient>
            </defs>

            {yTicks.map((tick) => (
              <g key={tick.t}>
                <line
                  x1={padLeft}
                  y1={tick.y}
                  x2={width - padRight}
                  y2={tick.y}
                  className="stroke-border/60"
                  strokeWidth={1}
                  strokeDasharray={tick.t === 0 ? undefined : "4 4"}
                />
                <text
                  x={padLeft - 8}
                  y={tick.y + 4}
                  textAnchor="end"
                  className="fill-current text-[10px] text-muted"
                >
                  {tick.value}
                </text>
              </g>
            ))}

            {data.map((month, index) => {
              const barH = (month.count / maxCount) * chartH;
              const x = padLeft + index * (barW + barGap);
              const y = padTop + chartH - barH;
              const isHovered = hoveredIndex === index;

              return (
                <g key={month.key}>
                  <rect
                    x={x - 4}
                    y={padTop}
                    width={barW + 8}
                    height={chartH + padBottom}
                    fill="transparent"
                    onMouseEnter={() => setHoveredIndex(index)}
                  />
                  <rect
                    x={x}
                    y={y}
                    width={barW}
                    height={Math.max(barH, month.count > 0 ? 4 : 0)}
                    rx={4}
                    fill="url(#sales-bar-fill)"
                    opacity={isHovered ? 1 : 0.88}
                  />
                  {month.count > 0 && isHovered ? (
                    <text
                      x={x + barW / 2}
                      y={y - 8}
                      textAnchor="middle"
                      className="fill-current text-[11px] font-semibold text-card-foreground"
                    >
                      {month.count}
                    </text>
                  ) : null}
                  <text
                    x={x + barW / 2}
                    y={height - 8}
                    textAnchor="middle"
                    className={cn(
                      "fill-current text-[10px] capitalize",
                      isHovered
                        ? "font-semibold text-card-foreground"
                        : "text-muted",
                    )}
                  >
                    {month.shortLabel}
                  </text>
                </g>
              );
            })}

            {hoveredX != null ? (
              <line
                x1={hoveredX}
                y1={padTop}
                x2={hoveredX}
                y2={padTop + chartH}
                className="stroke-accent/35"
                strokeWidth={1}
                strokeDasharray="3 3"
              />
            ) : null}
          </svg>

          {hovered ? (
            <div
              className="pointer-events-none absolute top-0 rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-lg"
              style={{
                left: `${(((hoveredX ?? 0) / width) * 100).toFixed(1)}%`,
                transform: "translateX(-50%)",
              }}
            >
              <p className="font-semibold capitalize text-card-foreground">
                {hovered.shortLabel}
              </p>
              <p className="mt-0.5 tabular-nums text-muted">
                {hovered.count} venta{hovered.count === 1 ? "" : "s"}
                {hovered.revenue > 0
                  ? ` · ${formatMoney(hovered.revenue)}`
                  : ""}
              </p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
