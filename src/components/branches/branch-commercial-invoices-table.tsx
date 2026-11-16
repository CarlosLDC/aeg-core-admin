"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import {
  CommercialInvoiceCollectionStatusBadge,
  CommercialInvoiceModalityBadge,
} from "@/components/commercial-invoices/commercial-invoice-badges";
import { CommercialInvoiceFormDialog } from "@/components/commercial-invoices/commercial-invoice-form-dialog";
import { ClickableTableRow } from "@/components/ui/clickable-table-row";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { EmptyState, TableFilterEmptyState } from "@/components/ui/empty-state";
import { SortableTableHeader } from "@/components/ui/sortable-table-header";
import {
  TableRowMetaCells,
  TableRowMetaHeaders,
} from "@/components/ui/table-meta-column-slots";
import { TablePagination } from "@/components/ui/table-pagination";
import {
  TableQuickFilterButton,
  TableQuickFilters,
} from "@/components/ui/table-quick-filters";
import { TableRowActionsMenu } from "@/components/ui/table-row-actions-menu";
import { TableScroll } from "@/components/ui/table-scroll";
import { useAuth } from "@/context/auth-provider";
import { useConfirm } from "@/context/confirm-provider";
import { useToast } from "@/context/toast-provider";
import { usePagination } from "@/hooks/use-pagination";
import { useTableColumnVisibility } from "@/hooks/use-table-column-visibility";
import { reportListTableError } from "@/lib/api-error-message";
import {
  canCreateCommercialInvoiceRecord,
  canDeleteCommercialInvoiceRecord,
  canModifyCommercialInvoiceRecord,
} from "@/lib/api-permissions";
import {
  filterCommercialInvoicesByQuickFilter,
  filterCommercialInvoicesForBranch,
  getBranchCommercialInvoiceStats,
  type BranchCommercialInvoiceQuickFilter,
} from "@/lib/branch-commercial-invoices";
import {
  COMMERCIAL_INVOICE_COLLECTION_STATUS_LABELS,
  COMMERCIAL_INVOICE_MODALITY_LABELS,
  formatCommercialInvoiceTitle,
  toCommercialInvoiceRequest,
} from "@/lib/commercial-invoice-form";
import {
  createCommercialInvoice,
  deleteCommercialInvoice,
  fetchCommercialInvoices,
  getCommercialInvoicesErrorMessage,
  updateCommercialInvoice,
} from "@/lib/commercial-invoices-api";
import { formatDate, formatMoney } from "@/lib/datetime-form";
import { forbiddenMessage } from "@/lib/permissions/messages";
import { commercialInvoicePath } from "@/lib/resource-routes";
import { filterAllOption } from "@/lib/table-filter-options";
import {
  compareDateValues,
  compareNumberValues,
  sortTableRows,
  toggleTableSort,
  type TableSortState,
} from "@/lib/table-sort";
import type { BranchWithRoles } from "@/types/branch";
import {
  COMMERCIAL_INVOICE_COLLECTION_STATUSES,
  COMMERCIAL_INVOICE_MODALITIES,
  type CommercialInvoiceCollectionStatus,
  type CommercialInvoiceFormValues,
  type CommercialInvoiceModality,
  type CommercialInvoiceResponse,
} from "@/types/commercial-invoice";

type BranchCommercialInvoiceSortKey =
  | "id"
  | "createdAt"
  | "numeroFactura"
  | "modalidad"
  | "estadoCobro"
  | "printerCount"
  | "paidAmountTotal";

type BranchCommercialInvoicesTableProps = {
  branch: BranchWithRoles;
};

export function BranchCommercialInvoicesTable({
  branch,
}: BranchCommercialInvoicesTableProps) {
  const toast = useToast();
  const confirm = useConfirm();
  const { user } = useAuth();

  const canCreate = user ? canCreateCommercialInvoiceRecord(user.role) : false;
  const canModify = user ? canModifyCommercialInvoiceRecord(user.role) : false;
  const canDelete = user ? canDeleteCommercialInvoiceRecord(user.role) : false;

  const [allInvoices, setAllInvoices] = useState<CommercialInvoiceResponse[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [dialog, setDialog] = useState<"create" | "edit" | null>(null);
  const [selected, setSelected] = useState<CommercialInvoiceResponse | null>(
    null,
  );
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [search, setSearch] = useState("");
  const [quickFilter, setQuickFilter] =
    useState<BranchCommercialInvoiceQuickFilter>("all");
  const [modalityFilter, setModalityFilter] = useState<
    CommercialInvoiceModality | "all"
  >("all");
  const [statusFilter, setStatusFilter] = useState<
    CommercialInvoiceCollectionStatus | "all"
  >("all");
  const [sort, setSort] =
    useState<TableSortState<BranchCommercialInvoiceSortKey>>(null);

  const tableColumns = useTableColumnVisibility(
    `branch-commercial-invoices-${branch.id}`,
  );

  const loadData = useCallback(
    async (options?: { silent?: boolean }) => {
      const silent = options?.silent ?? false;
      if (!silent) {
        setLoading(true);
        setListError(null);
      }
      try {
        const data = await fetchCommercialInvoices();
        setAllInvoices(data);
        setListError(null);
      } catch (err) {
        reportListTableError({
          message: getCommercialInvoicesErrorMessage(err),
          setListError,
          toast,
        });
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [toast],
  );

  useEffect(() => {
    if (!user) return;
    let active = true;
    void (async () => {
      try {
        const data = await fetchCommercialInvoices();
        if (!active) return;
        setAllInvoices(data);
        setListError(null);
      } catch (err) {
        if (!active) return;
        reportListTableError({
          message: getCommercialInvoicesErrorMessage(err),
          setListError,
          toast,
        });
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [toast, user]);

  const branchInvoices = useMemo(
    () => filterCommercialInvoicesForBranch(allInvoices, branch),
    [allInvoices, branch],
  );

  const stats = useMemo(
    () => getBranchCommercialInvoiceStats(branchInvoices),
    [branchInvoices],
  );

  const modalityFilterOptions = useMemo(
    () => [
      filterAllOption("Todas"),
      ...COMMERCIAL_INVOICE_MODALITIES.map((modality) => ({
        value: modality,
        label: COMMERCIAL_INVOICE_MODALITY_LABELS[modality],
      })),
    ],
    [],
  );

  const statusFilterOptions = useMemo(
    () => [
      filterAllOption("Todos"),
      ...COMMERCIAL_INVOICE_COLLECTION_STATUSES.map((status) => ({
        value: status,
        label: COMMERCIAL_INVOICE_COLLECTION_STATUS_LABELS[status],
      })),
    ],
    [],
  );

  const filteredInvoices = useMemo(() => {
    let list = filterCommercialInvoicesByQuickFilter(
      branchInvoices,
      quickFilter,
    );

    if (modalityFilter !== "all") {
      list = list.filter((invoice) => invoice.modalidad === modalityFilter);
    }

    if (statusFilter !== "all") {
      list = list.filter((invoice) => invoice.estadoCobro === statusFilter);
    }

    const q = search.trim().toLowerCase();
    if (!q) return list;

    return list.filter((invoice) => {
      const modalityLabel =
        COMMERCIAL_INVOICE_MODALITY_LABELS[invoice.modalidad] ??
        invoice.modalidad;
      const statusLabel =
        COMMERCIAL_INVOICE_COLLECTION_STATUS_LABELS[invoice.estadoCobro] ??
        invoice.estadoCobro;
      const haystack = [
        invoice.id,
        invoice.numeroFactura,
        invoice.sufijoControl,
        invoice.clienteComercialNombre,
        invoice.notasComerciales,
        invoice.modalidad,
        modalityLabel,
        invoice.estadoCobro,
        statusLabel,
        invoice.createdAt,
        formatDate(invoice.createdAt),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [branchInvoices, quickFilter, modalityFilter, statusFilter, search]);

  const sortedInvoices = useMemo(
    () =>
      sortTableRows(filteredInvoices, sort, {
        id: (a, b) => compareNumberValues(a.id, b.id),
        createdAt: (a, b) => compareDateValues(a.createdAt, b.createdAt),
        numeroFactura: (a, b) =>
          (a.numeroFactura ?? "").localeCompare(b.numeroFactura ?? "", "es", {
            numeric: true,
          }),
        modalidad: (a, b) =>
          (COMMERCIAL_INVOICE_MODALITY_LABELS[a.modalidad] ?? a.modalidad).localeCompare(
            COMMERCIAL_INVOICE_MODALITY_LABELS[b.modalidad] ?? b.modalidad,
            "es",
          ),
        estadoCobro: (a, b) =>
          (
            COMMERCIAL_INVOICE_COLLECTION_STATUS_LABELS[a.estadoCobro] ??
            a.estadoCobro
          ).localeCompare(
            COMMERCIAL_INVOICE_COLLECTION_STATUS_LABELS[b.estadoCobro] ??
              b.estadoCobro,
            "es",
          ),
        printerCount: (a, b) =>
          compareNumberValues(a.printerCount, b.printerCount),
        paidAmountTotal: (a, b) =>
          compareNumberValues(a.paidAmountTotal, b.paidAmountTotal),
      }),
    [filteredInvoices, sort],
  );

  const pagination = usePagination(sortedInvoices);

  function openCreate() {
    setSelected(null);
    setFormError(null);
    setDialog("create");
  }

  function openEdit(invoice: CommercialInvoiceResponse) {
    setSelected(invoice);
    setFormError(null);
    setDialog("edit");
  }

  function closeDialog() {
    setDialog(null);
    setSelected(null);
    setFormError(null);
  }

  async function handleSubmit(values: CommercialInvoiceFormValues) {
    if (dialog === "create" && !canCreate) {
      setFormError(forbiddenMessage("create", "commercialInvoices"));
      return;
    }
    if (dialog === "edit" && !canModify) {
      setFormError(forbiddenMessage("update", "commercialInvoices"));
      return;
    }

    const bodyOrError = toCommercialInvoiceRequest(values);
    if (typeof bodyOrError === "string") {
      setFormError(bodyOrError);
      return;
    }

    setSaving(true);
    setFormError(null);

    try {
      if (dialog === "create") {
        const created = await createCommercialInvoice(bodyOrError);
        toast.success(
          `Factura comercial ${formatCommercialInvoiceTitle(created)} creada.`,
          { href: commercialInvoicePath(created.id) },
        );
      } else if (selected) {
        const updated = await updateCommercialInvoice(selected.id, bodyOrError);
        toast.success(
          `Factura comercial ${formatCommercialInvoiceTitle(updated)} actualizada.`,
          { href: commercialInvoicePath(updated.id) },
        );
      }
      closeDialog();
      await loadData({ silent: true });
    } catch (err) {
      const message = getCommercialInvoicesErrorMessage(err);
      setFormError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(invoice: CommercialInvoiceResponse) {
    if (!canDelete) {
      toast.error(forbiddenMessage("delete", "commercialInvoices"));
      return;
    }
    const label = formatCommercialInvoiceTitle(invoice);
    if (
      !(await confirm({
        title: "Confirmar",
        message: `¿Eliminar la factura comercial ${label}? También se eliminarán sus pagos comerciales asociados.`,
        destructive: true,
        requireConfirmationText: label,
      }))
    ) {
      return;
    }
    setDeletingId(invoice.id);
    try {
      await deleteCommercialInvoice(invoice.id);
      toast.success("Factura comercial eliminada.");
      await loadData({ silent: true });
    } catch (err) {
      reportListTableError({
        message: getCommercialInvoicesErrorMessage(err),
        recordLabel: label,
        setListError,
        toast,
      });
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-card-foreground">
            Facturas comerciales asociadas
          </h3>
          <p className="text-xs text-muted">
            Facturas comerciales registradas para esta empresa
          </p>
        </div>
        {canCreate && (
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex w-full shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90 sm:w-auto"
          >
            <Plus className="size-4" />
            Nueva factura comercial
          </button>
        )}
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
            Cargando facturas comerciales…
          </div>
        ) : branchInvoices.length === 0 ? (
          <EmptyState
            title="Esta empresa no tiene facturas comerciales asociadas."
            description="Las facturas comerciales vinculadas a esta empresa aparecerán aquí."
            action={
              canCreate ? (
                <button
                  type="button"
                  onClick={openCreate}
                  className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90"
                >
                  <Plus className="size-4" />
                  Crear factura comercial
                </button>
              ) : undefined
            }
          />
        ) : (
          <>
            <TableQuickFilters>
              <TableQuickFilterButton
                active={quickFilter === "all"}
                onClick={() => setQuickFilter("all")}
              >
                Todas ({stats.total})
              </TableQuickFilterButton>
              <TableQuickFilterButton
                active={quickFilter === "paid"}
                onClick={() => setQuickFilter("paid")}
              >
                Pagadas ({stats.paid})
              </TableQuickFilterButton>
              <TableQuickFilterButton
                active={quickFilter === "pending"}
                onClick={() => setQuickFilter("pending")}
              >
                Pendientes ({stats.pending})
              </TableQuickFilterButton>
              {stats.other > 0 && (
                <TableQuickFilterButton
                  active={quickFilter === "other"}
                  onClick={() => setQuickFilter("other")}
                >
                  Sin cargo ({stats.other})
                </TableQuickFilterButton>
              )}
            </TableQuickFilters>

            <DataTableToolbar
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder="Buscar por N° factura, sufijo, modalidad, estado…"
              resultCount={filteredInvoices.length}
              totalCount={branchInvoices.length}
              filters={[
                {
                  id: "modalidad",
                  label: "Modalidad",
                  value: modalityFilter,
                  onChange: (value) =>
                    setModalityFilter(
                      value as CommercialInvoiceModality | "all",
                    ),
                  options: modalityFilterOptions,
                },
                {
                  id: "estadoCobro",
                  label: "Estado de cobro",
                  value: statusFilter,
                  onChange: (value) =>
                    setStatusFilter(
                      value as CommercialInvoiceCollectionStatus | "all",
                    ),
                  options: statusFilterOptions,
                },
              ]}
              columns={tableColumns.toolbarColumns}
            />

            {filteredInvoices.length === 0 ? (
              <TableFilterEmptyState />
            ) : (
              <>
                <TableScroll>
                  <table className="w-full min-w-[760px] text-left text-sm">
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
                            <th className="px-5 py-3 text-right font-medium">
                              Acciones
                            </th>
                          }
                        >
                          <SortableTableHeader
                            label="N° factura"
                            sortDirection={
                              sort?.key === "numeroFactura"
                                ? sort.direction
                                : null
                            }
                            onToggle={() =>
                              setSort((current) =>
                                toggleTableSort(current, "numeroFactura"),
                              )
                            }
                          />
                          <SortableTableHeader
                            label="Modalidad"
                            sortDirection={
                              sort?.key === "modalidad" ? sort.direction : null
                            }
                            onToggle={() =>
                              setSort((current) =>
                                toggleTableSort(current, "modalidad"),
                              )
                            }
                          />
                          <SortableTableHeader
                            label="Estado de cobro"
                            sortDirection={
                              sort?.key === "estadoCobro"
                                ? sort.direction
                                : null
                            }
                            onToggle={() =>
                              setSort((current) =>
                                toggleTableSort(current, "estadoCobro"),
                              )
                            }
                          />
                          <SortableTableHeader
                            label="Impresoras"
                            sortDirection={
                              sort?.key === "printerCount"
                                ? sort.direction
                                : null
                            }
                            onToggle={() =>
                              setSort((current) =>
                                toggleTableSort(current, "printerCount"),
                              )
                            }
                          />
                          <SortableTableHeader
                            label="Abonado"
                            sortDirection={
                              sort?.key === "paidAmountTotal"
                                ? sort.direction
                                : null
                            }
                            onToggle={() =>
                              setSort((current) =>
                                toggleTableSort(current, "paidAmountTotal"),
                              )
                            }
                          />
                        </TableRowMetaHeaders>
                      </tr>
                    </thead>
                    <tbody>
                      {pagination.paginatedItems.map((invoice) => {
                        const label = formatCommercialInvoiceTitle(invoice);
                        return (
                          <ClickableTableRow
                            key={invoice.id}
                            href={commercialInvoicePath(invoice.id)}
                          >
                            <TableRowMetaCells
                              showId={tableColumns.showId}
                              showCreatedAt={tableColumns.showCreatedAt}
                              id={invoice.id}
                              createdAt={invoice.createdAt}
                              actions={
                                <td
                                  className="px-5 py-3.5"
                                  data-row-click="ignore"
                                >
                                  <TableRowActionsMenu
                                    viewHref={commercialInvoicePath(invoice.id)}
                                    viewLabel={`Ver factura ${label}`}
                                    onEdit={
                                      canModify
                                        ? () => openEdit(invoice)
                                        : undefined
                                    }
                                    onDelete={
                                      canDelete
                                        ? () => void handleDelete(invoice)
                                        : undefined
                                    }
                                    deleting={deletingId === invoice.id}
                                  />
                                </td>
                              }
                            >
                              <td className="px-5 py-3.5 font-mono font-medium text-card-foreground">
                                {label}
                              </td>
                              <td className="px-5 py-3.5">
                                <CommercialInvoiceModalityBadge
                                  modality={invoice.modalidad}
                                />
                              </td>
                              <td className="px-5 py-3.5">
                                <CommercialInvoiceCollectionStatusBadge
                                  status={invoice.estadoCobro}
                                />
                              </td>
                              <td className="px-5 py-3.5 text-card-foreground">
                                <span className="font-mono text-sm">
                                  {invoice.printerCount}
                                </span>
                                <span className="ml-1 text-xs text-muted">
                                  {invoice.printerCount === 1
                                    ? "impresora"
                                    : "impresoras"}
                                </span>
                              </td>
                              <td className="px-5 py-3.5 text-card-foreground">
                                <div className="font-mono text-sm">
                                  {formatMoney(invoice.paidAmountTotal)}
                                </div>
                                <div className="text-xs text-muted">
                                  {invoice.paymentCount} pago
                                  {invoice.paymentCount === 1 ? "" : "s"}
                                </div>
                              </td>
                            </TableRowMetaCells>
                          </ClickableTableRow>
                        );
                      })}
                    </tbody>
                  </table>
                </TableScroll>
                <TablePagination pagination={pagination} />
              </>
            )}
          </>
        )}
      </div>

      <CommercialInvoiceFormDialog
        mode={dialog === "create" ? "create" : "edit"}
        invoice={selected ?? undefined}
        defaultEmpresaId={branch.companyId}
        lockEmpresa={dialog === "create"}
        open={dialog === "create" || dialog === "edit"}
        saving={saving}
        error={formError}
        onClose={closeDialog}
        onSubmit={(values) => void handleSubmit(values)}
      />
    </section>
  );
}
