"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { TechnicalServiceFormDialog } from "@/components/technical-services/technical-service-form-dialog";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { TablePagination } from "@/components/ui/table-pagination";
import { useAuth } from "@/context/auth-provider";
import { useToast } from "@/context/toast-provider";
import { useFieldOperationsCatalog } from "@/hooks/use-field-operations-catalog";
import { filterTechnicalServicesInScope } from "@/lib/scope-filters";
import { usePagination } from "@/hooks/use-pagination";
import { formatDateTime, formatMoney } from "@/lib/datetime-form";
import {
  toTechnicalServiceRequest,
  type TechnicalServiceFormValues,
} from "@/lib/technical-service-form";
import {
  createTechnicalService,
  deleteTechnicalService,
  fetchTechnicalServices,
  getTechnicalServicesErrorMessage,
  updateTechnicalService,
} from "@/lib/technical-services-api";
import type { TechnicalServiceResponse } from "@/types/technical-service";
import { cn } from "@/lib/utils";

export function TechnicalServicesManager() {
  const toast = useToast();
  const { user } = useAuth();
  const catalog = useFieldOperationsCatalog();

  const [rows, setRows] = useState<TechnicalServiceResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<"create" | "edit" | null>(null);
  const [selected, setSelected] = useState<TechnicalServiceResponse | null>(
    null,
  );
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  const printerLabelById = useMemo(
    () => new Map(catalog.printerOptions.map((p) => [p.value, p.label])),
    [catalog.printerOptions],
  );
  const technicianLabelById = useMemo(
    () => new Map(catalog.technicianOptions.map((t) => [t.value, t.label])),
    [catalog.technicianOptions],
  );

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => {
      const haystack = [
        row.id,
        row.printerId,
        row.technicianId,
        printerLabelById.get(String(row.printerId)),
        technicianLabelById.get(String(row.technicianId)),
        row.reportedFailure,
        row.notes,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [rows, search, printerLabelById, technicianLabelById]);

  const pagination = usePagination(filteredRows);

  const loadRows = useCallback(async () => {
    setLoading(true);
    setListError(null);
    try {
      const data = await fetchTechnicalServices();
      const role = user?.role ?? "SERVICE_CENTER";
      const scoped = filterTechnicalServicesInScope(
        data,
        catalog.scopedPrinterIds,
        role,
        catalog.distributorId,
      );
      setRows(
        scoped.sort((a, b) => b.startAt.localeCompare(a.startAt, "es")),
      );
    } catch (err) {
      const message = getTechnicalServicesErrorMessage(err);
      setListError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [toast, user?.role, catalog.scopedPrinterIds, catalog.distributorId]);

  useEffect(() => {
    if (catalog.loading) return;
    void loadRows();
  }, [catalog.loading, loadRows]);

  async function handleSubmit(values: TechnicalServiceFormValues) {
    const bodyOrError = toTechnicalServiceRequest(values);
    if (typeof bodyOrError === "string") {
      setFormError(bodyOrError);
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      if (dialog === "create") {
        await createTechnicalService(bodyOrError);
        toast.success("Servicio técnico registrado.");
      } else if (selected) {
        await updateTechnicalService(selected.id, bodyOrError);
        toast.success("Servicio técnico actualizado.");
      }
      setDialog(null);
      setSelected(null);
      await loadRows();
    } catch (err) {
      const message = getTechnicalServicesErrorMessage(err);
      setFormError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(row: TechnicalServiceResponse) {
    if (!window.confirm(`¿Eliminar el servicio técnico #${row.id}?`)) return;
    setDeletingId(row.id);
    try {
      await deleteTechnicalService(row.id);
      toast.success("Servicio eliminado.");
      await loadRows();
    } catch (err) {
      toast.error(getTechnicalServicesErrorMessage(err));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          Visitas de servicio técnico, reportes Z y gestión de precintos en campo.
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              loadRows();
              catalog.refresh();
            }}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-foreground/5 disabled:opacity-50"
          >
            <RefreshCw className={cn("size-4", loading && "animate-spin")} />
            Actualizar
          </button>
          <button
            type="button"
            onClick={() => {
              setSelected(null);
              setFormError(null);
              setDialog("create");
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-foreground"
          >
            <Plus className="size-4" />
            Nuevo servicio
          </button>
        </div>
      </div>

      {listError && (
        <p
          role="alert"
          className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300"
        >
          {listError}
        </p>
      )}

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-muted">
            <Loader2 className="size-5 animate-spin" />
            Cargando servicios…
          </div>
        ) : rows.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted">
            No hay servicios técnicos registrados.
          </p>
        ) : (
          <>
            <DataTableToolbar
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder="Buscar por impresora, técnico, falla…"
              resultCount={filteredRows.length}
              totalCount={rows.length}
            />
            {filteredRows.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted">
                No hay resultados con los filtros aplicados.
              </p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1100px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-border bg-foreground/[0.02] text-muted">
                        <th className="px-5 py-3 font-medium">ID</th>
                        <th className="px-5 py-3 font-medium">Impresora</th>
                        <th className="px-5 py-3 font-medium">Técnico</th>
                        <th className="px-5 py-3 font-medium">Inicio</th>
                        <th className="px-5 py-3 font-medium">Fin</th>
                        <th className="px-5 py-3 font-medium">Falla</th>
                        <th className="px-5 py-3 font-medium">Costo</th>
                        <th className="px-5 py-3 font-medium">Precinto</th>
                        <th className="px-5 py-3 font-medium text-right">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagination.paginatedItems.map((row) => (
                        <tr
                          key={row.id}
                          className="border-b border-border last:border-0 hover:bg-foreground/[0.02]"
                        >
                          <td className="px-5 py-3.5 text-muted">{row.id}</td>
                          <td className="max-w-[140px] truncate px-5 py-3.5 font-mono text-card-foreground">
                            {printerLabelById.get(String(row.printerId)) ??
                              `#${row.printerId}`}
                          </td>
                          <td className="max-w-[160px] truncate px-5 py-3.5 text-muted">
                            {technicianLabelById.get(String(row.technicianId)) ??
                              `#${row.technicianId}`}
                          </td>
                          <td className="px-5 py-3.5 text-muted">
                            {formatDateTime(row.startAt)}
                          </td>
                          <td className="px-5 py-3.5 text-muted">
                            {formatDateTime(row.endAt)}
                          </td>
                          <td className="max-w-[160px] truncate px-5 py-3.5 text-card-foreground">
                            {row.reportedFailure}
                          </td>
                          <td className="px-5 py-3.5 text-muted">
                            {formatMoney(row.cost)}
                          </td>
                          <td className="px-5 py-3.5 text-muted">
                            {row.sealTampered ? "Violentado" : "OK"}
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelected(row);
                                  setFormError(null);
                                  setDialog("edit");
                                }}
                                className="rounded-lg p-2 text-muted transition-colors hover:bg-foreground/5 hover:text-foreground"
                                aria-label={`Editar servicio #${row.id}`}
                              >
                                <Pencil className="size-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(row)}
                                disabled={deletingId === row.id}
                                className="rounded-lg p-2 text-muted transition-colors hover:bg-rose-500/10 hover:text-rose-600 disabled:opacity-50"
                                aria-label={`Eliminar servicio #${row.id}`}
                              >
                                {deletingId === row.id ? (
                                  <Loader2 className="size-4 animate-spin" />
                                ) : (
                                  <Trash2 className="size-4" />
                                )}
                              </button>
                            </div>
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

      <TechnicalServiceFormDialog
        mode={dialog === "create" ? "create" : "edit"}
        row={selected ?? undefined}
        open={dialog !== null}
        saving={saving}
        error={formError}
        catalogLoading={catalog.loading}
        canLoadPrinters={catalog.canLoadPrinters}
        printerOptions={catalog.printerOptions}
        technicianOptions={catalog.technicianOptions}
        sealOptions={catalog.sealOptions}
        serviceCenterOptions={catalog.serviceCenterOptions}
        distributorOptions={catalog.distributorOptions}
        onClose={() => {
          setDialog(null);
          setSelected(null);
          setFormError(null);
        }}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
