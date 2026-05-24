"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { ClickableTableRow } from "@/components/ui/clickable-table-row";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { EmptyState, TableFilterEmptyState } from "@/components/ui/empty-state";
import { TablePagination } from "@/components/ui/table-pagination";
import { useToast } from "@/context/toast-provider";
import { usePagination } from "@/hooks/use-pagination";
import {
  fetchClientModificationRequests,
  getClientModificationRequestsErrorMessage,
} from "@/lib/client-modification-requests-api";
import { formatDate } from "@/lib/datetime-form";
import {
  fetchEmployeeModificationRequests,
  getEmployeeModificationRequestsErrorMessage,
} from "@/lib/employee-modification-requests-api";
import {
  DEFAULT_POLL_INTERVAL_MS,
  DEFAULT_RETRY_DELAYS_MS,
  sleep,
} from "@/lib/polling";
import { clientPath, employeePath } from "@/lib/resource-routes";
import { filterTabToggleClass } from "@/lib/toggle-button-styles";
import type { ModificationActionType } from "@/types/client-modification-request";
import type { ModificationRequestStatus } from "@/types/employee-modification-request";
import { cn } from "@/lib/utils";

type ReviewSection = "employees" | "clients";

type UnifiedReviewRow = {
  id: number;
  section: ReviewSection;
  resourceId: number;
  resourceName: string;
  actionType: ModificationActionType;
  status: ModificationRequestStatus;
  requestedByName: string;
  createdAt: string;
  reviewHref: string;
  resourceHref: string;
};

const STATUS_LABELS: Record<ModificationRequestStatus, string> = {
  PENDING: "Pendiente",
  APPROVED: "Aprobada",
  REJECTED: "Rechazada",
};

const ACTION_LABELS: Record<ModificationActionType, string> = {
  UPDATE: "Actualizacion",
  DELETE: "Eliminacion",
};

const sectionToggleButtonClass =
  "inline-flex min-h-10 min-w-0 flex-1 items-center justify-center gap-2 rounded-lg px-2 py-2 text-center text-xs font-medium transition-colors sm:flex-none sm:px-4 sm:text-sm sm:whitespace-nowrap";

function pendingBadgeClass(active: boolean): string {
  return cn(
    "inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-semibold",
    active
      ? "bg-accent-foreground/20 text-accent-foreground"
      : "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  );
}

export function ModificationReviewsManager() {
  const toast = useToast();
  const searchParams = useSearchParams();
  const sectionParam = searchParams.get("section");
  const initialSection: ReviewSection =
    sectionParam === "clients" ? "clients" : "employees";

  const [activeSection, setActiveSection] = useState<ReviewSection>(initialSection);
  const [rows, setRows] = useState<UnifiedReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ModificationRequestStatus | "all">(
    "all",
  );
  const userChangedStatusFilter = useRef(false);
  const userChangedSectionFilter = useRef(false);

  const load = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const [
        pendingEmployees,
        approvedEmployees,
        rejectedEmployees,
        pendingClients,
        approvedClients,
        rejectedClients,
      ] = await Promise.all([
        fetchEmployeeModificationRequests("PENDING"),
        fetchEmployeeModificationRequests("APPROVED"),
        fetchEmployeeModificationRequests("REJECTED"),
        fetchClientModificationRequests("PENDING"),
        fetchClientModificationRequests("APPROVED"),
        fetchClientModificationRequests("REJECTED"),
      ]);

      const nextRows: UnifiedReviewRow[] = [
        ...pendingEmployees,
        ...approvedEmployees,
        ...rejectedEmployees,
      ].map((row) => ({
        id: row.id,
        section: "employees",
        resourceId: row.employeeId,
        resourceName: row.employeeName,
        actionType: row.actionType,
        status: row.status,
        requestedByName: row.requestedByName,
        createdAt: row.createdAt,
        reviewHref: `/reviews/employees/${row.id}`,
        resourceHref: employeePath(row.employeeId),
      }));

      nextRows.push(
        ...[...pendingClients, ...approvedClients, ...rejectedClients].map((row) => ({
          id: row.id,
          section: "clients" as const,
          resourceId: row.clientId,
          resourceName: row.clientName,
          actionType: row.actionType,
          status: row.status,
          requestedByName: row.requestedByName,
          createdAt: row.createdAt,
          reviewHref: `/reviews/clients/${row.id}`,
          resourceHref: clientPath(row.clientId),
        })),
      );

      const employeePendingCount = pendingEmployees.length;
      const clientPendingCount = pendingClients.length;
      if (!userChangedSectionFilter.current) {
        if (employeePendingCount > 0) {
          setActiveSection("employees");
        } else if (clientPendingCount > 0) {
          setActiveSection("clients");
        }
      }

      const pendingCount = employeePendingCount + clientPendingCount;
      if (!userChangedStatusFilter.current) {
        setStatusFilter(pendingCount > 0 ? "PENDING" : "all");
      }
      setRows(nextRows.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)));
      if (!silent) setError(null);
      return true;
    } catch (err) {
      if (silent) return false;
      const employeeError = getEmployeeModificationRequestsErrorMessage(err);
      const message =
        employeeError === "Ha ocurrido un error inesperado."
          ? getClientModificationRequestsErrorMessage(err)
          : employeeError;
      setError(message);
      toast.error(message);
      return false;
    } finally {
      if (!silent) setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    let running = false;

    const pollOnce = async () => {
      if (cancelled || running || document.visibilityState !== "visible") return;
      running = true;
      try {
        let ok = await load({ silent: true });
        if (ok) return;
        for (const delay of DEFAULT_RETRY_DELAYS_MS) {
          if (cancelled || document.visibilityState !== "visible") return;
          await sleep(delay);
          if (cancelled || document.visibilityState !== "visible") return;
          ok = await load({ silent: true });
          if (ok) return;
        }
      } finally {
        running = false;
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void pollOnce();
      }
    };

    const intervalId = window.setInterval(() => {
      void pollOnce();
    }, DEFAULT_POLL_INTERVAL_MS);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.clearInterval(intervalId);
    };
  }, [load]);

  const employeePendingCount = useMemo(
    () => rows.filter((row) => row.section === "employees" && row.status === "PENDING").length,
    [rows],
  );
  const clientPendingCount = useMemo(
    () => rows.filter((row) => row.section === "clients" && row.status === "PENDING").length,
    [rows],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (row.section !== activeSection) return false;
      if (statusFilter !== "all" && row.status !== statusFilter) return false;
      if (!q) return true;
      return `${row.id} ${row.resourceName} ${row.requestedByName} ${row.actionType}`
        .toLowerCase()
        .includes(q);
    });
  }, [rows, activeSection, search, statusFilter]);

  const pagination = usePagination(filtered);
  const sectionLabel = activeSection === "employees" ? "empleado" : "cliente";

  return (
    <div className="space-y-4">
      <div className="flex w-full justify-center">
        <div
          className="flex w-full max-w-md gap-1 rounded-lg border border-border bg-card p-1 sm:inline-flex sm:w-auto sm:max-w-none"
          role="tablist"
          aria-label="Seccion de revisiones"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeSection === "employees"}
            onClick={() => {
              userChangedSectionFilter.current = true;
              setActiveSection("employees");
            }}
            className={filterTabToggleClass(
              activeSection === "employees",
              sectionToggleButtonClass,
            )}
          >
            Empleados
            {employeePendingCount > 0 ? (
              <span className={pendingBadgeClass(activeSection === "employees")}>
                {employeePendingCount}
              </span>
            ) : null}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeSection === "clients"}
            onClick={() => {
              userChangedSectionFilter.current = true;
              setActiveSection("clients");
            }}
            className={filterTabToggleClass(
              activeSection === "clients",
              sectionToggleButtonClass,
            )}
          >
            Clientes
            {clientPendingCount > 0 ? (
              <span className={pendingBadgeClass(activeSection === "clients")}>
                {clientPendingCount}
              </span>
            ) : null}
          </button>
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300"
        >
          {error}
        </p>
      )}

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-muted">
            <Loader2 className="size-5 animate-spin" />
            Cargando solicitudes...
          </div>
        ) : rows.length === 0 ? (
          <EmptyState title="No hay solicitudes registradas." />
        ) : (
          <>
            <DataTableToolbar
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder={`Buscar por ${sectionLabel} o solicitante...`}
              resultCount={filtered.length}
              totalCount={rows.filter((row) => row.section === activeSection).length}
              filters={[
                {
                  id: "status",
                  label: "Estado",
                  value: statusFilter,
                  onChange: (value) => {
                    userChangedStatusFilter.current = true;
                    setStatusFilter(value as ModificationRequestStatus | "all");
                  },
                  options: [
                    { value: "all", label: "Todos" },
                    { value: "PENDING", label: "Pendientes" },
                    { value: "APPROVED", label: "Aprobadas" },
                    { value: "REJECTED", label: "Rechazadas" },
                  ],
                },
              ]}
            />
            {filtered.length === 0 ? (
              <TableFilterEmptyState />
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[880px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-border bg-foreground/[0.02] text-muted">
                        <th className="px-5 py-3 font-medium">Solicitud</th>
                        <th className="px-5 py-3 font-medium">
                          {activeSection === "employees" ? "Empleado" : "Cliente"}
                        </th>
                        <th className="px-5 py-3 font-medium">Accion</th>
                        <th className="px-5 py-3 font-medium">Estado</th>
                        <th className="px-5 py-3 font-medium">Solicitado por</th>
                        <th className="px-5 py-3 font-medium">Fecha</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagination.paginatedItems.map((row) => (
                        <ClickableTableRow key={`${row.section}-${row.id}`} href={row.reviewHref}>
                          <td className="px-5 py-3.5 font-mono">
                            <Link href={row.reviewHref} className="text-accent hover:underline">
                              {row.id}
                            </Link>
                          </td>
                          <td className="px-5 py-3.5">
                            <Link
                              href={row.resourceHref}
                              className="text-card-foreground hover:underline"
                            >
                              {row.resourceName}
                            </Link>
                          </td>
                          <td className="px-5 py-3.5">{ACTION_LABELS[row.actionType]}</td>
                          <td className="px-5 py-3.5">
                            <span
                              className={cn(
                                "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
                                row.status === "PENDING" &&
                                  "bg-amber-500/10 text-amber-800 dark:text-amber-200",
                                row.status === "APPROVED" &&
                                  "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
                                row.status === "REJECTED" &&
                                  "bg-rose-500/10 text-rose-700 dark:text-rose-300",
                              )}
                            >
                              {STATUS_LABELS[row.status]}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">{row.requestedByName}</td>
                          <td className="px-5 py-3.5 text-muted">
                            {formatDate(row.createdAt)}
                          </td>
                        </ClickableTableRow>
                      ))}
                    </tbody>
                  </table>
                </div>
                <TablePagination pagination={pagination} />
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
