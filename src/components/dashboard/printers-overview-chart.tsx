"use client";

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

const STATUS_COLORS: Record<string, string> = {
  laboratorio: "from-amber-500 to-amber-400",
  activo: "from-emerald-600 to-emerald-500",
  inactivo: "from-slate-500 to-slate-400",
};

export function PrintersOverviewChart({
  statusCounts,
  monthlyRegistrations,
  totalPrinters,
  className,
}: PrintersOverviewChartProps) {
  const statusMax = Math.max(1, ...statusCounts.map((s) => s.count));
  const monthlyMax = Math.max(1, ...monthlyRegistrations.map((m) => m.count));
  const activeCount =
    statusCounts.find((s) => s.status === "activo")?.count ?? 0;

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-5 shadow-sm",
        className,
      )}
    >
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-semibold text-card-foreground">Impresoras</h2>
          <p className="text-sm text-muted">Estatus y altas recientes</p>
        </div>
        <p className="text-2xl font-semibold tracking-tight text-card-foreground">
          {totalPrinters}
          <span className="ml-2 text-sm font-medium text-emerald-600">
            {activeCount} activas
          </span>
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted">
            Por estatus
          </p>
          <div className="flex h-40 items-end gap-3">
            {statusCounts.map((item) => (
              <div
                key={item.status}
                className="flex flex-1 flex-col items-center gap-2"
              >
                <span className="text-xs font-medium text-card-foreground">
                  {item.count}
                </span>
                <div
                  className={cn(
                    "w-full max-w-12 rounded-t-md bg-gradient-to-t",
                    STATUS_COLORS[item.status] ?? "from-indigo-600 to-violet-500",
                  )}
                  style={{
                    height: `${(item.count / statusMax) * 100}%`,
                    minHeight: item.count > 0 ? "0.5rem" : 0,
                  }}
                  title={`${item.label}: ${item.count}`}
                />
                <span className="text-center text-[10px] text-muted sm:text-xs">
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted">
            Altas por mes
          </p>
          <div className="flex h-40 items-end gap-2 sm:gap-3">
            {monthlyRegistrations.map((item) => (
              <div
                key={item.key}
                className="flex flex-1 flex-col items-center gap-2"
              >
                <span className="text-[10px] font-medium text-card-foreground">
                  {item.count > 0 ? item.count : ""}
                </span>
                <div
                  className="w-full max-w-8 rounded-t-md bg-gradient-to-t from-indigo-600 to-violet-500"
                  style={{
                    height: `${(item.count / monthlyMax) * 100}%`,
                    minHeight: item.count > 0 ? "0.5rem" : 0,
                  }}
                  title={`${item.label}: ${item.count}`}
                />
                <span className="text-[10px] capitalize text-muted sm:text-xs">
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
