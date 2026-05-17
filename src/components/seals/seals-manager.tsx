"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { SealFormDialog } from "@/components/seals/seal-form-dialog";
import type { PrinterSelectOption } from "@/components/printers/printer-select";
import { SealColorBadge } from "@/components/seals/seal-color-badge";
import { SealStatusBadge } from "@/components/seals/seal-status-badge";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { TablePagination } from "@/components/ui/table-pagination";
import { useAuth } from "@/context/auth-provider";
import { useCompanyScope } from "@/context/company-scope-provider";
import { useToast } from "@/context/toast-provider";
import { fetchAuthMe } from "@/lib/auth-me-api";
import { fetchBranches } from "@/lib/branches-api";
import { fetchClients } from "@/lib/clients-api";
import { fetchCompanies } from "@/lib/companies-api";
import { fetchDistributors } from "@/lib/distributors-api";
import { applyScopedFieldCatalog } from "@/lib/scope-filters";
import { usePagination } from "@/hooks/use-pagination";
import { fetchPrinters } from "@/lib/printers-api";
import {
  formatSealDate,
  SEAL_COLOR_LABELS,
  SEAL_STATUS_LABELS,
  toSealRequest,
  type SealFormValues,
} from "@/lib/seal-form";
import {
  createSeal,
  deleteSeal,
  fetchSeals,
  getSealsErrorMessage,
  updateSeal,
} from "@/lib/seals-api";
import type { SealColor, SealResponse, SealStatus } from "@/types/seal";
import { SEAL_COLORS, SEAL_STATUSES } from "@/types/seal";
import { cn } from "@/lib/utils";
import { TableScroll } from "@/components/ui/table-scroll";

export function SealsManager() {
  const toast = useToast();
  const { user } = useAuth();
  const { scope } = useCompanyScope();
  const canLoadPrinters =
    user?.role === "ADMIN" ||
    user?.role === "DISTRIBUTOR" ||
    user?.role === "TECHNICIAN";

  const [seals, setSeals] = useState<SealResponse[]>([]);
  const [printerOptions, setPrinterOptions] = useState<PrinterSelectOption[]>(
    [],
  );
  const [printersLoading, setPrintersLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [dialog, setDialog] = useState<"create" | "edit" | null>(null);
  const [selected, setSelected] = useState<SealResponse | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<SealStatus | "all">("all");
  const [colorFilter, setColorFilter] = useState<SealColor | "all">("all");

  const printerLabelById = useMemo(
    () => new Map(printerOptions.map((p) => [p.id, p.label])),
    [printerOptions],
  );

  const filteredSeals = useMemo(() => {
    const q = search.trim().toLowerCase();
    return seals.filter((seal) => {
      if (statusFilter !== "all" && seal.status !== statusFilter) return false;
      if (colorFilter !== "all" && seal.color !== colorFilter) return false;
      if (!q) return true;
      const haystack = [
        seal.id,
        seal.serial,
        seal.printerId,
        printerLabelById.get(seal.printerId ?? -1),
        seal.status,
        seal.color,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [seals, search, statusFilter, colorFilter, printerLabelById]);

  const pagination = usePagination(filteredSeals);

  const loadPrinters = useCallback(async () => {
    if (!user || !canLoadPrinters) {
      setPrinterOptions([]);
      return;
    }
    setPrintersLoading(true);
    try {
      let distributorId = user.distributorId;
      if (user.role === "DISTRIBUTOR" && distributorId == null) {
        try {
          const me = await fetchAuthMe();
          distributorId = me.distributorId ?? null;
        } catch {
          /* sin /api/auth/me */
        }
      }

      const [companies, branches, printersRaw, clients, distributors] =
        await Promise.all([
          scope ? Promise.resolve(scope.companies) : fetchCompanies(),
          scope ? Promise.resolve(scope.branches) : fetchBranches(),
          fetchPrinters(),
          fetchClients().catch(() => []),
          fetchDistributors().catch(() => []),
        ]);

      const scoped = applyScopedFieldCatalog({
        role: user.role,
        scope,
        distributorId,
        userBranchId: user.branchId,
        companies,
        branches,
        clients,
        distributors,
        serviceCenters: [],
        employees: [],
        technicians: [],
        printers: printersRaw,
        seals: [],
      });

      setPrinterOptions(
        scoped.printers
          .map((p) => ({
            id: p.id,
            label: `#${p.id} · ${p.fiscalSerial}`,
          }))
          .sort((a, b) => a.label.localeCompare(b.label, "es")),
      );
    } catch {
      setPrinterOptions([]);
    } finally {
      setPrintersLoading(false);
    }
  }, [canLoadPrinters, scope, user]);

  const loadSeals = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setListError(null);
    try {
      let distributorId = user.distributorId;
      if (user.role === "DISTRIBUTOR" && distributorId == null) {
        try {
          const me = await fetchAuthMe();
          distributorId = me.distributorId ?? null;
        } catch {
          /* sin /api/auth/me */
        }
      }

      const [companies, branches, sealsRaw, printersRaw, clients, distributors] =
        await Promise.all([
          scope ? Promise.resolve(scope.companies) : fetchCompanies(),
          scope ? Promise.resolve(scope.branches) : fetchBranches(),
          fetchSeals(),
          canLoadPrinters ? fetchPrinters().catch(() => []) : Promise.resolve([]),
          fetchClients().catch(() => []),
          fetchDistributors().catch(() => []),
        ]);

      const scoped = applyScopedFieldCatalog({
        role: user.role,
        scope,
        distributorId,
        userBranchId: user.branchId,
        companies,
        branches,
        clients,
        distributors,
        serviceCenters: [],
        employees: [],
        technicians: [],
        printers: printersRaw,
        seals: sealsRaw,
      });

      setSeals(
        scoped.seals.sort((a, b) =>
          b.createdAt.localeCompare(a.createdAt, "es"),
        ),
      );
    } catch (err) {
      const message = getSealsErrorMessage(err);
      setListError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [toast, user, scope, canLoadPrinters]);

  useEffect(() => {
    loadSeals();
    loadPrinters();
  }, [loadSeals, loadPrinters]);

  function getPrinterLabel(printerId: number | null): string {
    if (printerId == null) return "—";
    return printerLabelById.get(printerId) ?? `Impresora #${printerId}`;
  }

  function openCreate() {
    setSelected(null);
    setFormError(null);
    setDialog("create");
  }

  function openEdit(seal: SealResponse) {
    setSelected(seal);
    setFormError(null);
    setDialog("edit");
  }

  function closeDialog() {
    setDialog(null);
    setSelected(null);
    setFormError(null);
  }

  async function handleSubmit(values: SealFormValues) {
    const bodyOrError = toSealRequest(values);
    if (typeof bodyOrError === "string") {
      setFormError(bodyOrError);
      return;
    }

    setSaving(true);
    setFormError(null);

    try {
      if (dialog === "create") {
        await createSeal(bodyOrError);
        toast.success(`Precinto ${bodyOrError.serial} creado.`);
      } else if (selected) {
        await updateSeal(selected.id, bodyOrError);
        toast.success("Precinto actualizado.");
      }
      closeDialog();
      await loadSeals();
    } catch (err) {
      const message = getSealsErrorMessage(err);
      setFormError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(seal: SealResponse) {
    if (
      !window.confirm(`¿Eliminar el precinto con serial ${seal.serial}?`)
    ) {
      return;
    }
    setDeletingId(seal.id);
    try {
      await deleteSeal(seal.id);
      toast.success("Precinto eliminado.");
      await loadSeals();
    } catch (err) {
      toast.error(getSealsErrorMessage(err));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:flex-nowrap md:items-center md:justify-between md:gap-4">
        <p className="min-w-0 flex-1 text-sm text-muted">
          Inventario de precintos fiscales. Puedes asignarlos a una impresora,
          indicar color y seguir su ciclo de vida.
        </p>
        <div className="flex w-full shrink-0 flex-col gap-2 max-md:w-full md:w-auto md:flex-row md:flex-nowrap">
          <button
            type="button"
            onClick={() => {
              loadSeals();
              loadPrinters();
            }}
            disabled={loading}
            className="inline-flex w-full shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-border bg-card md:w-auto px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-foreground/5 disabled:opacity-50"
          >
            <RefreshCw className={cn("size-4", loading && "animate-spin")} />
            Actualizar
          </button>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex w-full shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-accent px-3 py-2 md:w-auto text-sm font-medium text-accent-foreground"
          >
            <Plus className="size-4" />
            Nuevo precinto
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
            Cargando precintos…
          </div>
        ) : seals.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted">
            No hay precintos registrados.
          </p>
        ) : (
          <>
            <DataTableToolbar
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder="Buscar por serial, impresora, color…"
              resultCount={filteredSeals.length}
              totalCount={seals.length}
              filters={[
                {
                  id: "status",
                  label: "Estatus",
                  value: statusFilter,
                  onChange: (value) =>
                    setStatusFilter(value as SealStatus | "all"),
                  options: [
                    { value: "all", label: "Todos" },
                    ...SEAL_STATUSES.map((status) => ({
                      value: status,
                      label: SEAL_STATUS_LABELS[status],
                    })),
                  ],
                },
                {
                  id: "color",
                  label: "Color",
                  value: colorFilter,
                  onChange: (value) =>
                    setColorFilter(value as SealColor | "all"),
                  options: [
                    { value: "all", label: "Todos" },
                    ...SEAL_COLORS.map((color) => ({
                      value: color,
                      label: SEAL_COLOR_LABELS[color],
                    })),
                  ],
                },
              ]}
            />
            {filteredSeals.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted">
                No hay resultados con los filtros aplicados.
              </p>
            ) : (
              <>
                <TableScroll>
                  <table className="w-full min-w-[960px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-border bg-foreground/[0.02] text-muted">
                        <th className="px-5 py-3 font-medium">Serial</th>
                        <th className="px-5 py-3 font-medium">Impresora</th>
                        <th className="px-5 py-3 font-medium">Color</th>
                        <th className="px-5 py-3 font-medium">Estatus</th>
                        <th className="px-5 py-3 font-medium">Instalación</th>
                        <th className="px-5 py-3 font-medium">Retiro</th>
                        <th className="px-5 py-3 font-medium text-right">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagination.paginatedItems.map((seal) => (
                        <tr
                          key={seal.id}
                          className="border-b border-border last:border-0 hover:bg-foreground/[0.02]"
                        >
                          <td className="px-5 py-3.5 font-mono font-medium text-card-foreground">
                            {seal.serial}
                          </td>
                          <td className="max-w-[180px] truncate px-5 py-3.5 text-muted">
                            {getPrinterLabel(seal.printerId)}
                          </td>
                          <td className="px-5 py-3.5">
                            <SealColorBadge color={seal.color} />
                          </td>
                          <td className="px-5 py-3.5">
                            <SealStatusBadge status={seal.status} />
                          </td>
                          <td className="px-5 py-3.5 text-muted">
                            {formatSealDate(seal.installationDate)}
                          </td>
                          <td className="px-5 py-3.5 text-muted">
                            {formatSealDate(seal.removalDate)}
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => openEdit(seal)}
                                className="rounded-lg p-2 text-muted transition-colors hover:bg-foreground/5 hover:text-foreground"
                                aria-label={`Editar ${seal.serial}`}
                              >
                                <Pencil className="size-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(seal)}
                                disabled={deletingId === seal.id}
                                className="rounded-lg p-2 text-muted transition-colors hover:bg-rose-500/10 hover:text-rose-600 disabled:opacity-50"
                                aria-label={`Eliminar ${seal.serial}`}
                              >
                                {deletingId === seal.id ? (
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
                </TableScroll>
            <TablePagination pagination={pagination} />
              </>
            )}
          </>
        )}
      </div>

      <SealFormDialog
        mode={dialog === "create" ? "create" : "edit"}
        seal={selected ?? undefined}
        open={dialog !== null}
        saving={saving}
        error={formError}
        printerOptions={printerOptions}
        printersLoading={printersLoading}
        onClose={closeDialog}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
