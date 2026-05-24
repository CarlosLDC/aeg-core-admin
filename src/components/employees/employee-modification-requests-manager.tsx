"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { EmptyState, TableFilterEmptyState } from "@/components/ui/empty-state";
import { TablePagination } from "@/components/ui/table-pagination";
import { useToast } from "@/context/toast-provider";
import { usePagination } from "@/hooks/use-pagination";
import { formatDate } from "@/lib/datetime-form";
import {
  fetchEmployeeModificationRequests,
  getEmployeeModificationRequestsErrorMessage,
} from "@/lib/employee-modification-requests-api";
import { employeePath } from "@/lib/resource-routes";
import type {
  ModificationRequestListItemResponse,
  ModificationRequestStatus,
} from "@/types/employee-modification-request";
import { cn } from "@/lib/utils";
import Link from "next/link";

const STATUS_LABELS: Record<ModificationRequestStatus, string> = {
  PENDING: "Pendiente",
  APPROVED: "Aprobada",
  REJECTED: "Rechazada",
};

const ACTION_LABELS = {
  UPDATE: "Actualización",
  DELETE: "Eliminación",
} as const;

export function EmployeeModificationRequestsManager() {
  const toast = useToast();
  const [rows, setRows] = useState<ModificationRequestListItemResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ModificationRequestStatus | "all">(
    "PENDING",
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data =
        statusFilter === "all"
          ? [
              ...(await fetchEmployeeModificationRequests("PENDING")),
              ...(await fetchEmployeeModificationRequests("APPROVED")),
              ...(await fetchEmployeeModificationRequests("REJECTED")),
            ]
          : await fetchEmployeeModificationRequests(statusFilter);
      setRows(data.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)));
    } catch (err) {
      const message = getEmployeeModificationRequestsErrorMessage(err);
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (statusFilter !== "all" && row.status !== statusFilter) return false;
      if (!q) return true;
      return `${row.id} ${row.employeeName} ${row.requestedByName} ${row.actionType}`
        .toLowerCase()
        .includes(q);
    });
  }, [rows, search, statusFilter]);

  const pagination = usePagination(filtered);

  return (
    <div className="space-y-4">
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
            Cargando solicitudes…
          </div>
        ) : rows.length === 0 ? (
          <EmptyState title="No hay solicitudes registradas." />
        ) : (
          <>
            <DataTableToolbar
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder="Buscar por empleado o solicitante…"
              resultCount={filtered.length}
              totalCount={rows.length}
              filters={[
                {
                  id: "status",
                  label: "Estado",
                  value: statusFilter,
                  onChange: (value) =>
                    setStatusFilter(value as ModificationRequestStatus | "all"),
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
                        <th className="px-5 py-3 font-medium">Empleado</th>
                        <th className="px-5 py-3 font-medium">Acción</th>
                        <th className="px-5 py-3 font-medium">Estado</th>
                        <th className="px-5 py-3 font-medium">Solicitado por</th>
                        <th className="px-5 py-3 font-medium">Fecha</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagination.paginatedItems.map((row) => (
                        <tr
                          key={row.id}
                          className="border-b border-border/70 transition-colors hover:bg-foreground/[0.02]"
                        >
                          <td className="px-5 py-3.5 font-mono">
                            <Link
                              href={`/employees/reviews/${row.id}`}
                              className="text-accent hover:underline"
                            >
                              #{row.id}
                            </Link>
                          </td>
                          <td className="px-5 py-3.5">
                            <Link
                              href={employeePath(row.employeeId)}
                              className="text-card-foreground hover:underline"
                            >
                              {row.employeeName}
                            </Link>
                          </td>
                          <td className="px-5 py-3.5">
                            {ACTION_LABELS[row.actionType]}
                          </td>
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
                        </tr>
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
