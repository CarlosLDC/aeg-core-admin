"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Building2,
  Contact,
  Printer,
  Users,
} from "lucide-react";
import { StatCard } from "@/components/admin/stat-card";
import { DashboardActivityList } from "@/components/dashboard/dashboard-activity";
import { DashboardRecentPrinters } from "@/components/dashboard/dashboard-recent-printers";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { DashboardWelcome } from "@/components/dashboard/dashboard-welcome";
import { DistributorSalesChart } from "@/components/dashboard/distributor-sales-chart";
import { PrintersOverviewChart } from "@/components/dashboard/printers-overview-chart";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { useAuth } from "@/context/auth-provider";
import { useCompanyScope } from "@/context/company-scope-provider";
import { fetchAuthMe } from "@/lib/auth-me-api";
import { distributorLabel } from "@/lib/branch-roles";
import {
  loadDashboardSnapshot,
  type DashboardSnapshot,
  type DashboardStat,
} from "@/lib/dashboard-data";
import { cn } from "@/lib/utils";
import type { Role } from "@/types/user";
import type { LucideIcon } from "lucide-react";

const STAT_ICONS: Record<string, LucideIcon> = {
  Empresas: Building2,
  Impresoras: Printer,
  Empleados: Contact,
  Clientes: Users,
  Distribuidores: Building2,
  "Centros de servicio": Building2,
};

function iconForStat(stat: DashboardStat): LucideIcon {
  return STAT_ICONS[stat.title] ?? Building2;
}

export function DashboardManager() {
  const { user } = useAuth();
  const { scope, catalogRoles, loading: scopeLoading } = useCompanyScope();
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [distributorId, setDistributorId] = useState<number | null>(
    user?.distributorId ?? null,
  );

  useEffect(() => {
    if (user?.role !== "TECHNICIAN") {
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
        catalogRoles,
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
  }, [user, scope, catalogRoles, distributorId]);

  useEffect(() => {
    if (!user || scopeLoading) return;
    load();
  }, [user, scopeLoading, load]);

  if (!user) return null;

  const canSeePrinters =
    user.role === "ADMIN" || user.role === "TECHNICIAN";

  const technicianBranchLabel = useMemo(() => {
    if (user.role !== "TECHNICIAN" || distributorId == null) return null;
    const distributors = catalogRoles?.distributors ?? [];
    const distributor = distributors.find((row) => row.id === distributorId);
    if (!distributor) return null;
    const branches = scope?.branches ?? [];
    const companies = scope?.companies ?? [];
    return distributorLabel(distributor, branches, companies);
  }, [user.role, distributorId, catalogRoles, scope]);

  const showWelcome = snapshot && !loading;

  return (
    <div className="space-y-6 sm:space-y-8">
      {showWelcome && (
        <DashboardWelcome
          role={user.role}
          snapshot={snapshot}
          technicianBranchLabel={technicianBranchLabel}
          onRefresh={load}
          refreshing={loading}
        />
      )}

      {loadError && (
        <ErrorState message={loadError} onRetry={load} retrying={loading} />
      )}

      {snapshot && snapshot.loadWarnings.length > 0 && (
        <p
          role="status"
          className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200"
        >
          {snapshot.loadWarnings.join(" ")}
        </p>
      )}

      {loading && !snapshot ? (
        <DashboardSkeleton />
      ) : snapshot ? (
        <>
          <section aria-labelledby="dashboard-kpis">
            <h2 id="dashboard-kpis" className="sr-only">
              Indicadores principales
            </h2>
            <div
              className={cn(
                "grid grid-cols-2 items-stretch gap-3 sm:gap-4",
                snapshot.stats.length > 3 ? "lg:grid-cols-4" : "lg:grid-cols-3",
              )}
            >
              {snapshot.stats.map((stat) => (
                <StatCard
                  key={stat.title}
                  title={stat.title}
                  value={stat.value}
                  hint={stat.hint}
                  href={stat.href}
                  icon={iconForStat(stat)}
                />
              ))}
            </div>
          </section>

          <section aria-labelledby="dashboard-overview">
            <h2 id="dashboard-overview" className="sr-only">
              Estadísticas
            </h2>
            {user.role === "TECHNICIAN" ? (
              <DistributorSalesChart
                className="min-w-0"
                data={snapshot.monthlySales ?? []}
              />
            ) : (
              <div className="grid grid-cols-1 gap-6 xl:grid-cols-3 xl:items-start">
                {canSeePrinters ? (
                  <PrintersOverviewChart
                    className="min-w-0 xl:col-span-2"
                    statusCounts={snapshot.printerStatusCounts}
                    monthlyRegistrations={snapshot.monthlyPrinterRegistrations}
                    totalPrinters={snapshot.printers.length}
                  />
                ) : (
                  <div className="min-w-0 rounded-xl border border-border bg-card p-5 shadow-sm xl:col-span-2">
                    <h3 className="font-semibold text-card-foreground">
                      Resumen operativo
                    </h3>
                    <p className="mt-1 text-sm text-muted">
                      Métricas de tu centro de servicio
                    </p>
                    <dl className="mt-6 grid gap-4 sm:grid-cols-2">
                      {snapshot.stats.map((stat) => (
                        <div
                          key={stat.title}
                          className="rounded-lg border border-border bg-background/50 px-4 py-3"
                        >
                          <dt className="text-xs font-medium uppercase tracking-wide text-muted">
                            {stat.title}
                          </dt>
                          <dd className="mt-1 text-2xl font-semibold text-card-foreground">
                            {stat.value}
                          </dd>
                          {stat.hint ? (
                            <dd className="mt-1 text-xs text-muted">
                              {stat.hint}
                            </dd>
                          ) : null}
                        </div>
                      ))}
                    </dl>
                  </div>
                )}
                <DashboardActivityList
                  items={snapshot.activity}
                  className="min-w-0 xl:col-span-1"
                />
              </div>
            )}
          </section>

          {canSeePrinters && (
            <section
              aria-labelledby="dashboard-recent-printers"
              className="border-t border-border pt-6"
            >
              <h2 id="dashboard-recent-printers" className="sr-only">
                Impresoras recientes
              </h2>
              <DashboardRecentPrinters
                printers={snapshot.recentPrinters}
                variant={user.role === "TECHNICIAN" ? "distributor" : "default"}
              />
            </section>
          )}
        </>
      ) : !loadError ? (
        <EmptyState
          title="No hay datos para mostrar"
          description="Cuando el API devuelva información de tu ámbito, el panel se completará automáticamente."
          action={
            <button
              type="button"
              onClick={load}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground"
            >
              Reintentar
            </button>
          }
        />
      ) : null}
    </div>
  );
}
