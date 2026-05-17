"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Building2,
  Contact,
  Loader2,
  MapPin,
  Printer,
  Users,
} from "lucide-react";
import { StatCard } from "@/components/admin/stat-card";
import { DashboardActivityList } from "@/components/dashboard/dashboard-activity";
import { DashboardRecentPrinters } from "@/components/dashboard/dashboard-recent-printers";
import { DashboardScopeSummary } from "@/components/dashboard/dashboard-scope-summary";
import { PrintersOverviewChart } from "@/components/dashboard/printers-overview-chart";
import { useAuth } from "@/context/auth-provider";
import { useCompanyScope } from "@/context/company-scope-provider";
import { fetchAuthMe } from "@/lib/auth-me-api";
import {
  loadDashboardSnapshot,
  type DashboardSnapshot,
  type DashboardStat,
} from "@/lib/dashboard-data";
import type { Role } from "@/types/user";
import type { LucideIcon } from "lucide-react";

const STAT_ICONS: Record<string, LucideIcon> = {
  Empresas: Building2,
  Sucursales: MapPin,
  Impresoras: Printer,
  Empleados: Contact,
  Clientes: Users,
  Distribuidores: Building2,
  "Centros de servicio": MapPin,
};

function iconForStat(stat: DashboardStat): LucideIcon {
  return STAT_ICONS[stat.title] ?? Building2;
}

function statGridClass(_role: Role): string {
  return "grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4";
}

export function DashboardManager() {
  const { user } = useAuth();
  const { scope, loading: scopeLoading } = useCompanyScope();
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [distributorId, setDistributorId] = useState<number | null>(
    user?.distributorId ?? null,
  );

  useEffect(() => {
    if (user?.role !== "DISTRIBUTOR") {
      setDistributorId(user?.distributorId ?? null);
      return;
    }
    if (user.distributorId != null) {
      setDistributorId(user.distributorId);
      return;
    }
    let cancelled = false;
    fetchAuthMe()
      .then((me) => {
        if (!cancelled) setDistributorId(me.distributorId ?? null);
      })
      .catch(() => {
        if (!cancelled) setDistributorId(null);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.role, user?.distributorId]);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setLoadError(null);
    try {
      const data = await loadDashboardSnapshot({
        role: user.role,
        scope,
        distributorId,
        userBranchId: user.branchId,
      });
      setSnapshot(data);
    } catch {
      setSnapshot(null);
      setLoadError(
        "No se pudo cargar el resumen del panel. Comprueba la conexión con el API e inténtalo de nuevo.",
      );
    } finally {
      setLoading(false);
    }
  }, [user, scope, distributorId]);

  useEffect(() => {
    if (!user || scopeLoading) return;
    load();
  }, [user, scopeLoading, load]);

  if (!user) return null;

  const canSeePrinters =
    user.role === "ADMIN" ||
    user.role === "DISTRIBUTOR" ||
    user.role === "TECHNICIAN";

  return (
    <div className="space-y-8">
      {snapshot && (
        <DashboardScopeSummary role={user.role} snapshot={snapshot} />
      )}

      {loadError && (
        <p
          role="alert"
          className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300"
        >
          {loadError}
        </p>
      )}

      {snapshot && snapshot.loadWarnings.length > 0 && (
        <p
          role="alert"
          className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200"
        >
          {snapshot.loadWarnings.join(" ")}
        </p>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-20 text-muted">
          <Loader2 className="size-6 animate-spin" />
          Cargando resumen…
        </div>
      ) : snapshot ? (
        <>
          <div className={statGridClass(user.role)}>
            {snapshot.stats.map((stat) => (
              <StatCard
                key={stat.title}
                title={stat.title}
                value={stat.value}
                hint={stat.hint}
                icon={iconForStat(stat)}
              />
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-5">
            {canSeePrinters ? (
              <PrintersOverviewChart
                className="xl:col-span-3"
                statusCounts={snapshot.printerStatusCounts}
                monthlyRegistrations={snapshot.monthlyPrinterRegistrations}
                totalPrinters={snapshot.printers.length}
              />
            ) : (
              <div className="rounded-xl border border-border bg-card p-5 shadow-sm xl:col-span-3">
                <h2 className="font-semibold text-card-foreground">
                  Resumen operativo
                </h2>
                <p className="mt-2 text-sm text-muted">
                  {snapshot.stats.map((s) => `${s.title}: ${s.value}`).join(" · ")}
                </p>
              </div>
            )}
            <DashboardActivityList
              items={snapshot.activity}
              className="xl:col-span-2"
            />
          </div>

          {canSeePrinters && (
            <DashboardRecentPrinters printers={snapshot.recentPrinters} />
          )}
        </>
      ) : !loadError ? (
        <p className="py-12 text-center text-sm text-muted">
          No hay datos para mostrar.
        </p>
      ) : null}
    </div>
  );
}
