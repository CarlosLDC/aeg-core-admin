"use client";

import { useMemo, useState } from "react";
import type {
  MonthlyCount,
  PrinterStatusCount,
} from "@/lib/dashboard-data";
import { cn } from "@/lib/utils";

type PrintersOverviewChartProps = {
  statusCounts: PrinterStatusCount[];
  monthlyRegistrations: MonthlyCount[];
  totalPrinters: number;
  className?: string;
};

const STATUS_STYLES: Record<
  string,
  { stroke: string; fill: string; dot: string }
> = {
  laboratorio: {
    stroke: "#f59e0b",
    fill: "rgba(245, 158, 11, 0.15)",
    dot: "bg-amber-500",
  },
  activo: {
    stroke: "#10b981",
    fill: "rgba(16, 185, 129, 0.15)",
    dot: "bg-emerald-500",
  },
  inactivo: {
    stroke: "#94a3b8",
    fill: "rgba(148, 163, 184, 0.12)",
    dot: "bg-slate-400",
  },
};

function monthlyTrend(months: MonthlyCount[]): {
  delta: number;
  label: string;
} | null {
  if (months.length < 2) return null;
  const prev = months[months.length - 2]?.count ?? 0;
  const last = months[months.length - 1]?.count ?? 0;
  if (prev === 0 && last === 0) return null;
  const delta =
    prev === 0 ? (last > 0 ? 100 : 0) : Math.round(((last - prev) / prev) * 100);
  const label = months[months.length - 2]?.label ?? "";
  return { delta, label };
}

function StatusDonut({
  statusCounts,
  total,
  activeCount,
}: {
  statusCounts: PrinterStatusCount[];
  total: number;
  activeCount: number;
}) {
  const size = 168;
  const stroke = 18;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const activePct = total > 0 ? Math.round((activeCount / total) * 100) : 0;

  let offset = 0;
  const segments = statusCounts
    .filter((s) => s.count > 0)
    .map((item) => {
      const pct = item.count / Math.max(total, 1);
      const length = pct * circumference;
      const seg = {
        ...item,
        length,
        dasharray: `${length} ${circumference - length}`,
        dashoffset: -offset,
        color: STATUS_STYLES[item.status]?.stroke ?? "#6366f1",
      };
      offset += length;
      return seg;
    });

  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6">
        <div
          className="flex size-40 items-center justify-center rounded-full border-2 border-dashed border-border bg-foreground/[0.02]"
          aria-hidden
        >
          <span className="text-sm text-muted">Sin datos</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:gap-8">
      <div className="relative shrink-0">
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="-rotate-90"
          role="img"
          aria-label={`Distribución por estatus: ${activePct}% activas`}
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            className="text-border/80"
          />
          {segments.map((seg) => (
            <circle
              key={seg.status}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={seg.dasharray}
              strokeDashoffset={seg.dashoffset}
              className="transition-all duration-700 ease-out"
            />
          ))}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-semibold tracking-tight text-card-foreground">
            {activePct}%
          </span>
          <span className="text-xs text-muted">activas</span>
        </div>
      </div>

      <ul className="w-full min-w-0 space-y-2.5 sm:flex-1">
        {statusCounts.map((item) => {
          const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
          const style = STATUS_STYLES[item.status];
          return (
            <li key={item.status}>
              <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                <span className="flex items-center gap-2 text-card-foreground">
                  <span
                    className={cn("size-2.5 shrink-0 rounded-full", style?.dot)}
                  />
                  {item.label}
                </span>
                <span className="tabular-nums text-muted">
                  {item.count}{" "}
                  <span className="text-xs">({pct}%)</span>
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-foreground/5">
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: style?.stroke,
                  }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function MonthlyAreaChart({
  data,
  hoveredIndex,
  onHover,
}: {
  data: MonthlyCount[];
  hoveredIndex: number | null;
  onHover: (index: number | null) => void;
}) {
  const width = 400;
  const height = 160;
  const padX = 8;
  const padY = 20;
  const chartW = width - padX * 2;
  const chartH = height - padY * 2;
  const max = Math.max(1, ...data.map((d) => d.count));

  const points = data.map((d, i) => {
    const x = padX + (data.length <= 1 ? chartW / 2 : (i / (data.length - 1)) * chartW);
    const y = padY + chartH - (d.count / max) * chartH;
    return { x, y, ...d, i };
  });

  const linePath =
    points.length > 0
      ? points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ")
      : "";

  const areaPath =
    points.length > 0
      ? `${linePath} L ${points[points.length - 1]!.x} ${padY + chartH} L ${points[0]!.x} ${padY + chartH} Z`
      : "";

  const gridLines = [0, 0.5, 1].map((t) => padY + chartH * (1 - t));

  const hovered = hoveredIndex != null ? points[hoveredIndex] : null;

  if (data.every((d) => d.count === 0)) {
    return (
      <div className="flex h-44 items-center justify-center rounded-lg border border-dashed border-border bg-foreground/[0.02]">
        <p className="text-sm text-muted">Sin altas en los últimos meses</p>
      </div>
    );
  }

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-44 w-full overflow-visible"
        preserveAspectRatio="none"
        onMouseLeave={() => onHover(null)}
        role="img"
        aria-label="Altas de impresoras por mes"
      >
        <defs>
          <linearGradient id="monthly-area-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0033ff" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#0033ff" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="monthly-line" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0033ff" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>
        </defs>

        {gridLines.map((y, i) => (
          <line
            key={i}
            x1={padX}
            y1={y}
            x2={width - padX}
            y2={y}
            className="stroke-border/60"
            strokeWidth={1}
            strokeDasharray="4 4"
          />
        ))}

        {areaPath && (
          <path d={areaPath} fill="url(#monthly-area-fill)" className="transition-opacity duration-300" />
        )}

        {linePath && (
          <path
            d={linePath}
            fill="none"
            stroke="url(#monthly-line)"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {points.map((p) => (
          <g key={p.key}>
            <rect
              x={p.x - chartW / data.length / 2}
              y={0}
              width={chartW / data.length}
              height={height}
              fill="transparent"
              onMouseEnter={() => onHover(p.i)}
            />
            <circle
              cx={p.x}
              cy={p.y}
              r={hoveredIndex === p.i ? 6 : 4}
              className={cn(
                "fill-accent stroke-card transition-all duration-200",
                hoveredIndex === p.i ? "stroke-2" : "stroke-[1.5]",
              )}
            />
          </g>
        ))}

        {hovered && (
          <g>
            <line
              x1={hovered.x}
              y1={padY}
              x2={hovered.x}
              y2={padY + chartH}
              className="stroke-accent/40"
              strokeWidth={1}
              strokeDasharray="3 3"
            />
          </g>
        )}
      </svg>

      <div className="mt-2 flex justify-between gap-1 px-0.5">
        {data.map((item, i) => (
          <span
            key={item.key}
            className={cn(
              "flex-1 truncate text-center text-[10px] capitalize sm:text-xs",
              hoveredIndex === i
                ? "font-medium text-card-foreground"
                : "text-muted",
            )}
          >
            {item.label}
          </span>
        ))}
      </div>

      {hovered && (
        <div
          className="pointer-events-none absolute -top-1 left-1/2 z-10 -translate-x-1/2 rounded-lg border border-border bg-card px-3 py-1.5 text-center text-xs shadow-md"
          style={{
            left: `${((hovered.x - padX) / chartW) * 100}%`,
          }}
        >
          <p className="font-semibold text-card-foreground">{hovered.count}</p>
          <p className="capitalize text-muted">{hovered.label}</p>
        </div>
      )}
    </div>
  );
}

export function PrintersOverviewChart({
  statusCounts,
  monthlyRegistrations,
  totalPrinters,
  className,
}: PrintersOverviewChartProps) {
  const [hoveredMonth, setHoveredMonth] = useState<number | null>(null);

  const activeCount =
    statusCounts.find((s) => s.status === "activo")?.count ?? 0;
  const trend = useMemo(
    () => monthlyTrend(monthlyRegistrations),
    [monthlyRegistrations],
  );
  const recentTotal = useMemo(
    () => monthlyRegistrations.reduce((sum, m) => sum + m.count, 0),
    [monthlyRegistrations],
  );

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5",
        className,
      )}
    >
      <div className="mb-5 flex shrink-0 flex-wrap items-end justify-between gap-4 sm:mb-6">
        <div>
          <h2 className="font-semibold text-card-foreground">Impresoras</h2>
          <p className="text-sm text-muted">
            Distribución por estatus y tendencia de altas
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-semibold tracking-tight text-card-foreground">
            {totalPrinters}
          </p>
          <p className="mt-0.5 text-sm text-muted">
            <span className="font-medium text-emerald-600 dark:text-emerald-400">
              {activeCount} activas
            </span>
            {recentTotal > 0 && (
              <span className="text-muted">
                {" "}
                · {recentTotal} altas en 6 meses
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-6 lg:grid-cols-5 lg:items-stretch lg:gap-8">
        <section className="flex min-h-[220px] flex-col lg:col-span-2 lg:min-h-0">
          <p className="mb-4 text-xs font-medium uppercase tracking-wide text-muted">
            Por estatus
          </p>
          <div className="flex flex-1 items-center justify-center">
            <StatusDonut
              statusCounts={statusCounts}
              total={totalPrinters}
              activeCount={activeCount}
            />
          </div>
        </section>

        <section className="flex min-h-[220px] flex-col lg:col-span-3 lg:min-h-0">
          <div className="mb-4 flex flex-nowrap items-center justify-between gap-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">
              Altas por mes
            </p>
            {trend && (
              <span
                className={cn(
                  "shrink-0 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium",
                  trend.delta >= 0
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                    : "bg-rose-500/10 text-rose-700 dark:text-rose-300",
                )}
              >
                {trend.delta >= 0 ? "+" : ""}
                {trend.delta}% vs. {trend.label}
              </span>
            )}
          </div>
          <div className="flex min-h-0 flex-1 flex-col justify-center">
            <MonthlyAreaChart
              data={monthlyRegistrations}
              hoveredIndex={hoveredMonth}
              onHover={setHoveredMonth}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
