"use client";

import { useMemo, useState } from "react";
import type {
  MonthlyCount,
  MonthlyStatusMix,
  PrinterStatusCount,
} from "@/lib/dashboard-data";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

type PrintersOverviewChartProps = {
  variant?: "default" | "distributor";
  statusCounts: PrinterStatusCount[];
  monthlyRegistrations: MonthlyCount[];
  monthlyStatusMix?: MonthlyStatusMix[];
  totalPrinters: number;
  className?: string;
};

const STATUS_STYLES: Record<
  string,
  { stroke: string; dot: string }
> = {
  de_demostracion: { stroke: "#6366f1", dot: "bg-indigo-500" },
  de_fabrica: { stroke: "#0ea5e9", dot: "bg-sky-500" },
  inicializada: { stroke: "#a855f7", dot: "bg-violet-500" },
  asignada: { stroke: "#10b981", dot: "bg-emerald-500" },
  enajenada: { stroke: "#f97316", dot: "bg-orange-500" },
  desincorporada: { stroke: "#64748b", dot: "bg-slate-500" },
  laboratorio: { stroke: "#f59e0b", dot: "bg-amber-500" },
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
  centerValue,
  centerLabel,
}: {
  statusCounts: PrinterStatusCount[];
  total: number;
  centerValue: string;
  centerLabel: string;
}) {
  const size = 152;
  const stroke = 16;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
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
      <div className="flex flex-col items-center justify-center py-8">
        <div className="flex size-36 items-center justify-center rounded-full border-2 border-dashed border-border bg-foreground/[0.02]">
          <span className="text-sm text-muted">Sin impresoras</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative shrink-0 p-1">
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="-rotate-90"
          role="img"
          aria-label={`Distribución por estatus: ${centerValue} ${centerLabel}`}
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
          {segments.length > 0 ? (
            segments.map((seg) => (
              <circle
                key={seg.status}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={seg.color}
                strokeWidth={stroke}
                strokeLinecap="butt"
                strokeDasharray={seg.dasharray}
                strokeDashoffset={seg.dashoffset}
              />
            ))
          ) : (
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth={stroke}
              className="text-muted/40"
            />
          )}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-semibold tracking-tight text-card-foreground tabular-nums">
            {centerValue}
          </span>
          <span className="text-xs text-muted">{centerLabel}</span>
        </div>
      </div>

      <ul
        className={cn(
          "grid w-full max-w-md grid-cols-1 gap-3",
          statusCounts.length <= 2 ? "sm:grid-cols-2" : "sm:grid-cols-3",
        )}
      >
        {statusCounts.map((item) => {
          const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
          const style = STATUS_STYLES[item.status];
          return (
            <li
              key={item.status}
              className="rounded-lg border border-border bg-background/50 px-3 py-2.5"
            >
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="flex min-w-0 items-center gap-2 font-medium text-card-foreground">
                  <span
                    className={cn("size-2.5 shrink-0 rounded-full", style?.dot)}
                  />
                  <span className="truncate">{item.label}</span>
                </span>
                <span className="shrink-0 tabular-nums text-muted">
                  {item.count}
                </span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-foreground/5">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: style?.stroke,
                  }}
                />
              </div>
              <p className="mt-1 text-xs text-muted">{pct}% del total</p>
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
  const width = 480;
  const height = 180;
  const padX = 24;
  const padY = 16;
  const labelH = 20;
  const chartW = width - padX * 2;
  const chartH = height - padY - labelH;
  const max = Math.max(1, ...data.map((d) => d.count));

  const points = data.map((d, i) => {
    const x =
      padX +
      (data.length <= 1 ? chartW / 2 : (i / Math.max(data.length - 1, 1)) * chartW);
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

  const hovered = hoveredIndex != null ? points[hoveredIndex] : null;

  if (data.every((d) => d.count === 0)) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-border bg-foreground/[0.02]">
        <EmptyState compact className="py-8" title="Sin altas en los últimos meses" />
      </div>
    );
  }

  return (
    <div className="relative w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full max-h-52"
        preserveAspectRatio="xMidYMid meet"
        onMouseLeave={() => onHover(null)}
        role="img"
        aria-label="Altas de impresoras por mes"
      >
        <defs>
          <linearGradient id="monthly-area-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0033ff" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#0033ff" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="monthly-line" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0033ff" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>
        </defs>

        {[0, 0.5, 1].map((t, i) => {
          const y = padY + chartH * (1 - t);
          return (
            <line
              key={i}
              x1={padX}
              y1={y}
              x2={width - padX}
              y2={y}
              className="stroke-border/50"
              strokeWidth={1}
              strokeDasharray="4 4"
            />
          );
        })}

        {areaPath ? (
          <path d={areaPath} fill="url(#monthly-area-fill)" />
        ) : null}
        {linePath ? (
          <path
            d={linePath}
            fill="none"
            stroke="url(#monthly-line)"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}

        {points.map((p) => (
          <g key={p.key}>
            <rect
              x={p.x - chartW / data.length / 2}
              y={0}
              width={Math.max(chartW / data.length, 24)}
              height={height - labelH}
              fill="transparent"
              onMouseEnter={() => onHover(p.i)}
            />
            <circle
              cx={p.x}
              cy={p.y}
              r={hoveredIndex === p.i ? 6 : 4}
              className={cn(
                "fill-accent stroke-card",
                hoveredIndex === p.i ? "stroke-2" : "stroke-[1.5]",
              )}
            />
            <text
              x={p.x}
              y={height - 6}
              textAnchor="middle"
              className={cn(
                "fill-current text-[11px] capitalize",
                hoveredIndex === p.i
                  ? "font-semibold text-card-foreground"
                  : "text-muted",
              )}
            >
              {p.label}
            </text>
          </g>
        ))}

        {hovered ? (
          <line
            x1={hovered.x}
            y1={padY}
            x2={hovered.x}
            y2={padY + chartH}
            className="stroke-accent/40"
            strokeWidth={1}
            strokeDasharray="3 3"
          />
        ) : null}
      </svg>

      {hovered ? (
        <div
          className="pointer-events-none absolute top-2 rounded-lg border border-border bg-card px-3 py-1.5 text-center text-xs shadow-md"
          style={{
            left: `${((hovered.x / width) * 100).toFixed(1)}%`,
            transform: "translateX(-50%)",
          }}
        >
          <p className="font-semibold tabular-nums text-card-foreground">
            {hovered.count}
          </p>
          <p className="capitalize text-muted">{hovered.label}</p>
        </div>
      ) : null}
    </div>
  );
}

function MonthlyStatusMixChart({
  data,
  hoveredIndex,
  onHover,
}: {
  data: MonthlyStatusMix[];
  hoveredIndex: number | null;
  onHover: (index: number | null) => void;
}) {
  const width = 480;
  const height = 180;
  const padX = 24;
  const padY = 16;
  const labelH = 20;
  const chartW = width - padX * 2;
  const chartH = height - padY - labelH;
  const max = Math.max(
    1,
    ...data.map((d) => d.asignada + d.enajenada),
  );

  if (data.every((d) => d.asignada + d.enajenada === 0)) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-border bg-foreground/[0.02]">
        <EmptyState
          compact
          className="py-8"
          title="Sin movimientos en los últimos meses"
        />
      </div>
    );
  }

  return (
    <div className="relative w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full max-h-52"
        preserveAspectRatio="xMidYMid meet"
        onMouseLeave={() => onHover(null)}
        role="img"
        aria-label="Altas mensuales por estatus de cartera"
      >
        {[0, 0.5, 1].map((t, i) => {
          const y = padY + chartH * (1 - t);
          return (
            <line
              key={i}
              x1={padX}
              y1={y}
              x2={width - padX}
              y2={y}
              className="stroke-border/50"
              strokeWidth={1}
              strokeDasharray="4 4"
            />
          );
        })}

        {data.map((d, i) => {
          const total = d.asignada + d.enajenada;
          const barW =
            data.length <= 1 ? chartW * 0.4 : (chartW / data.length) * 0.55;
          const x =
            padX +
            (data.length <= 1
              ? chartW / 2 - barW / 2
              : (i / Math.max(data.length - 1, 1)) * (chartW - barW) +
                barW / 2);
          const baseY = padY + chartH;
          const assignH = (d.asignada / max) * chartH;
          const disposeH = (d.enajenada / max) * chartH;

          return (
            <g key={d.key}>
              <rect
                x={x - barW / 2 - 8}
                y={padY}
                width={barW + 16}
                height={chartH + labelH}
                fill="transparent"
                onMouseEnter={() => onHover(i)}
              />
              <rect
                x={x - barW / 2}
                y={baseY - assignH - disposeH}
                width={barW}
                height={assignH}
                rx={2}
                fill="#10b981"
                opacity={hoveredIndex === i ? 1 : 0.85}
              />
              <rect
                x={x - barW / 2}
                y={baseY - disposeH}
                width={barW}
                height={disposeH}
                rx={2}
                fill="#f97316"
                opacity={hoveredIndex === i ? 1 : 0.85}
              />
              <text
                x={x}
                y={height - 6}
                textAnchor="middle"
                className={cn(
                  "fill-current text-[11px] capitalize",
                  hoveredIndex === i
                    ? "font-semibold text-card-foreground"
                    : "text-muted",
                )}
              >
                {d.label}
              </text>
              {hoveredIndex === i ? (
                <text
                  x={x}
                  y={baseY - assignH - disposeH - 6}
                  textAnchor="middle"
                  className="fill-current text-[10px] font-medium text-card-foreground"
                >
                  {total}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>

      <div className="mt-3 flex flex-wrap justify-center gap-4 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-emerald-500" />
          Asignadas
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-orange-500" />
          Enajenadas
        </span>
      </div>
    </div>
  );
}

export function PrintersOverviewChart({
  variant = "default",
  statusCounts,
  monthlyRegistrations,
  monthlyStatusMix,
  totalPrinters,
  className,
}: PrintersOverviewChartProps) {
  const [hoveredMonth, setHoveredMonth] = useState<number | null>(null);
  const isDistributor = variant === "distributor";

  const assignedCount =
    statusCounts.find((s) => s.status === "asignada")?.count ?? 0;
  const disposedCount =
    statusCounts.find((s) => s.status === "enajenada")?.count ?? 0;
  const activeCount = statusCounts
    .filter((s) =>
      ["asignada", "inicializada", "de_demostracion"].includes(s.status),
    )
    .reduce((sum, item) => sum + item.count, 0);
  const trend = useMemo(
    () => (isDistributor ? null : monthlyTrend(monthlyRegistrations)),
    [isDistributor, monthlyRegistrations],
  );
  const recentTotal = useMemo(
    () =>
      isDistributor
        ? (monthlyStatusMix ?? []).reduce(
            (sum, m) => sum + m.asignada + m.enajenada,
            0,
          )
        : monthlyRegistrations.reduce((sum, m) => sum + m.count, 0),
    [isDistributor, monthlyRegistrations, monthlyStatusMix],
  );
  const donutCenter = isDistributor
    ? {
        value: String(assignedCount),
        label: "asignadas",
      }
    : {
        value:
          totalPrinters > 0
            ? `${Math.round((activeCount / totalPrinters) * 100)}%`
            : "0%",
        label: "operativas",
      };

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6",
        className,
      )}
    >
      <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-card-foreground">Impresoras</h2>
          <p className="mt-0.5 text-sm text-muted">
            {isDistributor
              ? "Cartera asignada y equipos enajenados a clientes"
              : "Estatus de la flota y altas mensuales"}
          </p>
        </div>
        <dl className="flex flex-wrap gap-4 sm:gap-6 sm:text-right">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted">
              Total
            </dt>
            <dd className="text-2xl font-semibold tabular-nums text-card-foreground">
              {totalPrinters}
            </dd>
          </div>
          {isDistributor ? (
            <>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted">
                  Asignadas
                </dt>
                <dd className="text-2xl font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                  {assignedCount}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted">
                  Enajenadas
                </dt>
                <dd className="text-2xl font-semibold tabular-nums text-orange-600 dark:text-orange-400">
                  {disposedCount}
                </dd>
              </div>
            </>
          ) : (
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted">
                Operativas
              </dt>
              <dd className="text-2xl font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                {activeCount}
              </dd>
            </div>
          )}
          {recentTotal > 0 ? (
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted">
                Altas (6 meses)
              </dt>
              <dd className="text-2xl font-semibold tabular-nums text-card-foreground">
                {recentTotal}
              </dd>
            </div>
          ) : null}
        </dl>
      </div>

      <section className="border-b border-border py-6">
        <h3 className="mb-4 text-xs font-medium uppercase tracking-wide text-muted">
          Por estatus
        </h3>
        <StatusDonut
          statusCounts={statusCounts}
          total={totalPrinters}
          centerValue={donutCenter.value}
          centerLabel={donutCenter.label}
        />
      </section>

      <section className="pt-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-xs font-medium uppercase tracking-wide text-muted">
            {isDistributor ? "Altas mensuales por estatus" : "Altas por mes"}
          </h3>
          {trend ? (
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-medium",
                trend.delta >= 0
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                  : "bg-rose-500/10 text-rose-700 dark:text-rose-300",
              )}
            >
              {trend.delta >= 0 ? "+" : ""}
              {trend.delta}% vs. {trend.label}
            </span>
          ) : null}
        </div>
        {isDistributor && monthlyStatusMix ? (
          <MonthlyStatusMixChart
            data={monthlyStatusMix}
            hoveredIndex={hoveredMonth}
            onHover={setHoveredMonth}
          />
        ) : (
          <MonthlyAreaChart
            data={monthlyRegistrations}
            hoveredIndex={hoveredMonth}
            onHover={setHoveredMonth}
          />
        )}
      </section>
    </div>
  );
}
