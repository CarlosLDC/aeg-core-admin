"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Layers, Loader2, Plus } from "lucide-react";
import {
  SealBatchFormDialog,
  type SealBatchSubmitPayload,
} from "@/components/seals/seal-batch-form-dialog";
import { SealFormDialog } from "@/components/seals/seal-form-dialog";
import { runSerialBatch } from "@/lib/batch-create";
import type { PrinterSelectOption } from "@/components/printers/printer-select";
import { SealColorBadge } from "@/components/seals/seal-color-badge";
import { SealStatusBadge } from "@/components/seals/seal-status-badge";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { EmptyState, TableFilterEmptyState } from "@/components/ui/empty-state";
import {
  PageToolbar,
  pageToolbarButtonClass,
} from "@/components/ui/page-toolbar";
import { TablePagination } from "@/components/ui/table-pagination";
import {
  TableRowMetaCells,
  TableRowMetaHeaders,
} from "@/components/ui/table-meta-column-slots";
import { filterAllOption } from "@/lib/table-filter-options";
import { useTableColumnVisibility } from "@/hooks/use-table-column-visibility";
import { useAuth } from "@/context/auth-provider";
import { useCompanyScope } from "@/context/company-scope-provider";
import { useToast } from "@/context/toast-provider";
import { useConfirm } from "@/context/confirm-provider";
import {
  canCreateSealRecord,
  canDeleteSealRecord,
  canModifySealRecord,
} from "@/lib/api-permissions";
import { forbiddenMessage } from "@/lib/permissions/messages";
import { fetchAuthMe } from "@/lib/auth-me-api";
import { fetchBranches } from "@/lib/branches-api";
import { fetchClients } from "@/lib/clients-api";
import { fetchCompanies } from "@/lib/companies-api";
import { fetchDistributors } from "@/lib/distributors-api";
import { applyScopedFieldCatalog } from "@/lib/scope-filters";
import { reportListTableError } from "@/lib/api-error-message";
import { usePagination } from "@/hooks/use-pagination";
import { fetchPrinters } from "@/lib/printers-api";
import { fetchUsers } from "@/lib/users-api";
import {
  compareDateValues,
  compareNumberValues,
  sortTableRows,
  toggleTableSort,
  type TableSortState,
} from "@/lib/table-sort";
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
import { TruncatedText } from "@/components/ui/truncated-text";
import { SortableTableHeader } from "@/components/ui/sortable-table-header";
import { sealPath } from "@/lib/resource-routes";
import { ClickableTableRow } from "@/components/ui/clickable-table-row";
import { TableRowActionsMenu } from "@/components/ui/table-row-actions-menu";

type SealSortKey = "id" | "createdAt" | "installationDate" | "removalDate";

export function SealsManager() {
  const toast = useToast();
  const confirm = useConfirm();
  const { user } = useAuth();
  const { scope } = useCompanyScope();
  const canCreate = user ? canCreateSealRecord(user.role) : false;
  const canModify = user ? canModifySealRecord(user.role) : false;
  const canDelete = user ? canDeleteSealRecord(user.role) : false;

  const canLoadPrinters =
    user?.role === "ADMIN" || user?.role === "TECHNICIAN";

  const [seals, setSeals] = useState<SealResponse[]>([]);
  const [printerOptions, setPrinterOptions] = useState<PrinterSelectOption[]>(
    [],
  );
  const [printersLoading, setPrintersLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [dialog, setDialog] = useState<"create" | "edit" | "batch" | null>(null);
  const [selected, setSelected] = useState<SealResponse | null>(null);
  const [saving, setSaving] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{
    done: number;
    total: number;
  } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<SealStatus | "all">("all");
  const [colorFilter, setColorFilter] = useState<SealColor | "all">("all");
  const [printerFilter, setPrinterFilter] = useState("all");
  const tableColumns = useTableColumnVisibility("seals");
  const [sort, setSort] = useState<TableSortState<SealSortKey>>(null);

  const printerLabelById = useMemo(
    () => new Map(printerOptions.map((p) => [p.id, p.label])),
    [printerOptions],
  );

  const printerSerialById = useMemo(
    () =>
      new Map(
        printerOptions.map((p) => [p.id, p.serial ?? p.label]),
      ),
    [printerOptions],
  );

  const printerFilterOptions = useMemo(
    () => [
      filterAllOption("Todas las impresoras"),
      ...printerOptions.map((printer) => ({
        value: String(printer.id),
        label: printer.label,
        searchText: [String(printer.id), printer.serial, printer.label]
          .filter(Boolean)
          .join(" "),
      })),
    ],
    [printerOptions],
  );

  const filteredSeals = useMemo(() => {
    const q = search.trim().toLowerCase();
    return seals.filter((seal) => {
      if (statusFilter !== "all" && seal.status !== statusFilter) return false;
      if (colorFilter !== "all" && seal.color !== colorFilter) return false;
      if (
        printerFilter !== "all" &&
        String(seal.printerId ?? "") !== printerFilter
      ) {
        return false;
      }
      if (!q) return true;
      const haystack = [
        seal.id,
        seal.serial,
        seal.printerId,
        printerSerialById.get(seal.printerId ?? -1),
        printerLabelById.get(seal.printerId ?? -1),
        seal.status,
        seal.color,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [
    seals,
    search,
    statusFilter,
    colorFilter,
    printerFilter,
    printerLabelById,
    printerSerialById,
  ]);

  const sortedSeals = useMemo(
    () =>
      sortTableRows(filteredSeals, sort, {
        id: (a, b) => compareNumberValues(a.id, b.id),
        createdAt: (a, b) => compareDateValues(a.createdAt, b.createdAt),
        installationDate: (a, b) =>
          compareDateValues(a.installationDate, b.installationDate),
        removalDate: (a, b) => compareDateValues(a.removalDate, b.removalDate),
      }),
    [filteredSeals, sort],
  );

  const pagination = usePagination(sortedSeals);

  const loadPrinters = useCallback(async () => {
    if (!user || !canLoadPrinters) {
      setPrinterOptions([]);
      return;
    }
    setPrintersLoading(true);
    try {
      let distributorId = user.distributorId;
      if (user.role === "TECHNICIAN" && distributorId == null) {
        try {
          const me = await fetchAuthMe();
          distributorId = me.distributorId ?? null;
        } catch {
          /* sin /api/auth/me */
        }
      }

      const [companies, branches, printersRaw, clients, distributors, usersRaw] =
        await Promise.all([
          scope ? Promise.resolve(scope.companies) : fetchCompanies(),
          scope ? Promise.resolve(scope.branches) : fetchBranches(),
          fetchPrinters(),
          fetchClients().catch(() => []),
          fetchDistributors().catch(() => []),
          fetchUsers().catch(() => []),
        ]);

      const scoped = applyScopedFieldCatalog({
        role: user.role,
        scope,
        distributorId,
        companies,
        branches,
        clients,
        distributors,
        serviceCenters: [],
        technicianUsers: usersRaw.filter(
          (row) => row.role === "TECHNICIAN" && row.enabled,
        ),
        printers: printersRaw,
        seals: [],
      });

      setPrinterOptions(
        scoped.printers
          .map((p) => ({
            id: p.id,
            label: p.fiscalSerial,
            serial: p.fiscalSerial,
          }))
          .sort((a, b) => a.label.localeCompare(b.label, "es")),
      );
    } catch {
      setPrinterOptions([]);
    } finally {
      setPrintersLoading(false);
    }
  }, [canLoadPrinters, scope, user]);

  const loadSeals = useCallback(async (options?: { silent?: boolean }) => {
    if (!user) return;
    const silent = options?.silent ?? false;
    if (!silent) {
      setLoading(true);
      setListError(null);
    }
    try {
      let distributorId = user.distributorId;
      if (user.role === "TECHNICIAN" && distributorId == null) {
        try {
          const me = await fetchAuthMe();
          distributorId = me.distributorId ?? null;
        } catch {
          /* sin /api/auth/me */
        }
      }

      const [companies, branches, sealsRaw, printersRaw, clients, distributors, usersRaw] =
        await Promise.all([
          scope ? Promise.resolve(scope.companies) : fetchCompanies(),
          scope ? Promise.resolve(scope.branches) : fetchBranches(),
          fetchSeals(),
          canLoadPrinters ? fetchPrinters().catch(() => []) : Promise.resolve([]),
          fetchClients().catch(() => []),
          fetchDistributors().catch(() => []),
          fetchUsers().catch(() => []),
        ]);

      const scoped = applyScopedFieldCatalog({
        role: user.role,
        scope,
        distributorId,
        companies,
        branches,
        clients,
        distributors,
        serviceCenters: [],
        technicianUsers: usersRaw.filter(
          (row) => row.role === "TECHNICIAN" && row.enabled,
        ),
        printers: printersRaw,
        seals: sealsRaw,
      });

      setSeals(
        scoped.seals.sort((a, b) =>
          b.createdAt.localeCompare(a.createdAt, "es"),
        ),
      );
    } catch (err) {
      reportListTableError({
        message: getSealsErrorMessage(err),
        setListError,
        toast,
      });
    } finally {
      if (!silent) setLoading(false);
    }
  }, [toast, user, scope, canLoadPrinters]);

  useEffect(() => {
    loadSeals();
    loadPrinters();
  }, [loadSeals, loadPrinters]);

  function getPrinterLabel(printerId: number | null): string {
    if (printerId == null) return "—";
    return printerSerialById.get(printerId) ?? "—";
  }

  function openCreate() {
    setSelected(null);
    setFormError(null);
    setDialog("create");
  }

  function openBatchCreate() {
    setSelected(null);
    setFormError(null);
    setBatchProgress(null);
    setDialog("batch");
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
    setBatchProgress(null);
  }

  async function handleBatchSubmit({ serials, base }: SealBatchSubmitPayload) {
    if (!canCreate) {
      setFormError(forbiddenMessage("create", "seals"));
      return;
    }

    if (!(await confirm({ title: "Confirmar", message: `¿Crear ${serials.length} precinto${serials.length === 1 ? "" : "s"} con seriales del rango indicado?`, destructive: true }))) {
      return;
    }

    setSaving(true);
    setFormError(null);
    setBatchProgress({ done: 0, total: serials.length });

    const result = await runSerialBatch(
      serials,
      async (serial) => {
        const bodyOrError = toSealRequest({ ...base, serial });
        if (typeof bodyOrError === "string") {
          throw new Error(bodyOrError);
        }
        await createSeal(bodyOrError);
      },
      (p) => setBatchProgress({ done: p.done, total: p.total }),
    );

    setSaving(false);
    setBatchProgress(null);

    if (result.succeeded > 0) {
      toast.success(
        `${result.succeeded} precinto${result.succeeded === 1 ? "" : "s"} creado${result.succeeded === 1 ? "" : "s"}.`,
      );
      await loadSeals();
    }

    if (result.failed.length > 0) {
      const sample = result.failed
        .slice(0, 3)
        .map((f) => `${f.serial}: ${f.message}`)
        .join(" · ");
      const more =
        result.failed.length > 3
          ? ` (+${result.failed.length - 3} más)`
          : "";
      setFormError(
        `No se pudieron crear ${result.failed.length} registro(s). ${sample}${more}`,
      );
      toast.error(
        `Lote incompleto: ${result.failed.length} error${result.failed.length === 1 ? "" : "es"}.`,
      );
      if (result.succeeded > 0) return;
    } else {
      closeDialog();
    }
  }

  async function handleSubmit(values: SealFormValues) {
    if (dialog === "create" && !canCreate) {
      setFormError(forbiddenMessage("create", "seals"));
      return;
    }
    if (dialog === "edit" && !canModify) {
      setFormError(forbiddenMessage("update", "seals"));
      return;
    }

    const bodyOrError = toSealRequest(values);
    if (typeof bodyOrError === "string") {
      setFormError(bodyOrError);
      return;
    }

    setSaving(true);
    setFormError(null);

    try {
      if (dialog === "create") {
        const created = await createSeal(bodyOrError);
        toast.success(`Precinto ${bodyOrError.serial} creado.`, {
          href: sealPath(created.id),
        });
      } else if (selected) {
        await updateSeal(selected.id, bodyOrError);
        toast.success("Precinto actualizado.", {
          href: sealPath(selected.id),
        });
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

  async function handleDelete(seal: SealResponse, fromDialog = false) {
    if (!canDelete) {
      toast.error(forbiddenMessage("delete", "seals"));
      return;
    }
    if (!(await confirm({ title: "Confirmar", message: `¿Eliminar el precinto con serial ${seal.serial}?`, destructive: true }))) {
      return;
    }
    setDeletingId(seal.id);
    try {
      await deleteSeal(seal.id);
      if (fromDialog) closeDialog();
      toast.success("Precinto eliminado.");
      await loadSeals({ silent: true });
    } catch (err) {
      reportListTableError({
        message: getSealsErrorMessage(err),
        recordLabel: `Precinto ${seal.serial}`,
        setListError,
        toast,
      });
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <PageToolbar
        actions={
          canCreate ? (
            <>
              <button
                type="button"
                onClick={openBatchCreate}
                  className={cn(
                    pageToolbarButtonClass,
                    "border border-border bg-card text-foreground hover:bg-foreground/5",
                  )}
                >
                  <Layers className="size-4" />
                  Crear por lote
                </button>
                <button
                  type="button"
                  onClick={openCreate}
                  className={cn(
                    pageToolbarButtonClass,
                    "bg-accent text-accent-foreground",
                  )}
                >
                  <Plus className="size-4" />
                  Nuevo precinto
                </button>
              </>
          ) : undefined
        }
      />

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
          <EmptyState title="No hay precintos registrados." />
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
                    filterAllOption(),
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
                    filterAllOption(),
                    ...SEAL_COLORS.map((color) => ({
                      value: color,
                      label: SEAL_COLOR_LABELS[color],
                    })),
                  ],
                },
                {
                  id: "printer",
                  label: "Impresora",
                  value: printerFilter,
                  onChange: setPrinterFilter,
                  options: printerFilterOptions,
                  searchable: true,
                  searchPlaceholder: "Buscar por serial o ID…",
                },
              ]}
              columns={tableColumns.toolbarColumns}
            />
            {filteredSeals.length === 0 ? (
              <TableFilterEmptyState />
            ) : (
              <>
                <TableScroll>
                  <table className="w-full min-w-[960px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-border bg-foreground/[0.02] text-muted">
                        <TableRowMetaHeaders
                          showId={tableColumns.showId}
                          showCreatedAt={tableColumns.showCreatedAt}
                          idSort={{
                            sortDirection:
                              sort?.key === "id" ? sort.direction : null,
                            onSortToggle: () =>
                              setSort((current) =>
                                toggleTableSort(current, "id"),
                              ),
                          }}
                          createdAtSort={{
                            sortDirection:
                              sort?.key === "createdAt" ? sort.direction : null,
                            onSortToggle: () =>
                              setSort((current) =>
                                toggleTableSort(current, "createdAt"),
                              ),
                          }}
                          actions={
                            <th className="px-5 py-3 font-medium text-right">
                              Acciones
                            </th>
                          }
                        >
                          <th className="px-5 py-3 font-medium">Serial</th>
                          <th className="px-5 py-3 font-medium">Impresora</th>
                          <th className="px-5 py-3 font-medium">Color</th>
                          <th className="px-5 py-3 font-medium">Estatus</th>
                          <SortableTableHeader
                            label="Instalación"
                            sortDirection={
                              sort?.key === "installationDate"
                                ? sort.direction
                                : null
                            }
                            onToggle={() =>
                              setSort((current) =>
                                toggleTableSort(current, "installationDate"),
                              )
                            }
                          />
                          <SortableTableHeader
                            label="Retiro"
                            sortDirection={
                              sort?.key === "removalDate" ? sort.direction : null
                            }
                            onToggle={() =>
                              setSort((current) =>
                                toggleTableSort(current, "removalDate"),
                              )
                            }
                          />
                        </TableRowMetaHeaders>
                      </tr>
                    </thead>
                    <tbody>
                      {pagination.paginatedItems.map((seal) => (
                        <ClickableTableRow
                          key={seal.id}
                          href={sealPath(seal.id)}
                        >
                          <TableRowMetaCells
                            showId={tableColumns.showId}
                            showCreatedAt={tableColumns.showCreatedAt}
                            id={seal.id}
                            createdAt={seal.createdAt}
                            actions={
                              <td className="px-5 py-3.5" data-row-click="ignore">
                                <TableRowActionsMenu
                                  viewHref={sealPath(seal.id)}
                                  viewLabel={`Ver precinto ${seal.serial}`}
                                  onEdit={
                                    canModify ? () => openEdit(seal) : undefined
                                  }
                                  onDelete={
                                    canDelete ? () => handleDelete(seal) : undefined
                                  }
                                  deleting={deletingId === seal.id}
                                />
                              </td>
                            }
                          >
                          <td className="px-5 py-3.5 font-mono font-medium text-card-foreground">
                            {seal.serial}
                          </td>
                          <td className="max-w-[180px] px-5 py-3.5 text-muted">
                            <TruncatedText maxClassName="max-w-[160px]">
                              {getPrinterLabel(seal.printerId)}
                            </TruncatedText>
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
                          </TableRowMetaCells>
                        </ClickableTableRow>
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

      <SealBatchFormDialog
        open={dialog === "batch"}
        saving={saving}
        progress={batchProgress}
        error={formError}
        onClose={closeDialog}
        onSubmit={(payload) => void handleBatchSubmit(payload)}
      />

      <SealFormDialog
        mode={dialog === "create" ? "create" : "edit"}
        seal={selected ?? undefined}
        open={dialog === "create" || dialog === "edit"}
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
