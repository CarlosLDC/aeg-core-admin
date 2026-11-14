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
import {
  PageToolbar,
  pageToolbarButtonClass,
} from "@/components/ui/page-toolbar";
import { SortableTableHeader } from "@/components/ui/sortable-table-header";
import {
  TableRowMetaCells,
  TableRowMetaHeaders,
} from "@/components/ui/table-meta-column-slots";
import { TablePagination } from "@/components/ui/table-pagination";
import { TableRowActionsMenu } from "@/components/ui/table-row-actions-menu";
import { TableScroll } from "@/components/ui/table-scroll";
import { TruncatedText } from "@/components/ui/truncated-text";
import { useAuth } from "@/context/auth-provider";
import { useConfirm } from "@/context/confirm-provider";
import { useToast } from "@/context/toast-provider";
import { usePagination } from "@/hooks/use-pagination";
import { useTableColumnVisibility } from "@/hooks/use-table-column-visibility";
import { useTableFilter } from "@/hooks/use-table-filter";
import { useTableSearch } from "@/hooks/use-table-search";
import { reportListTableError } from "@/lib/api-error-message";
import {
  canCreateCommercialInvoiceRecord,
  canDeleteCommercialInvoiceRecord,
  canModifyCommercialInvoiceRecord,
} from "@/lib/api-permissions";
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
import { cn } from "@/lib/utils";
import {
  COMMERCIAL_INVOICE_COLLECTION_STATUSES,
  COMMERCIAL_INVOICE_MODALITIES,
  type CommercialInvoiceCollectionStatus,
  type CommercialInvoiceFormValues,
  type CommercialInvoiceModality,
  type CommercialInvoiceResponse,
} from "@/types/commercial-invoice";

type InvoiceSortKey =
  | "id"
  | "createdAt"
  | "numeroFactura"
  | "paidAmountTotal"
  | "printerCount";

export function CommercialInvoicesManager() {
  const toast = useToast();
  const confirm = useConfirm();
  const { user } = useAuth();
  const canCreate = user ? canCreateCommercialInvoiceRecord(user.role) : false;
  const canModify = user ? canModifyCommercialInvoiceRecord(user.role) : false;
  const canDelete = user ? canDeleteCommercialInvoiceRecord(user.role) : false;

  const [invoices, setInvoices] = useState<CommercialInvoiceResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [dialog, setDialog] = useState<"create" | "edit" | null>(null);
  const [selected, setSelected] = useState<CommercialInvoiceResponse | null>(
    null,
  );
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [search, setSearch] = useTableSearch("/commercial-invoices");
  const [modalityFilter, setModalityFilter] = useTableFilter<
    CommercialInvoiceModality | "all"
  >("/commercial-invoices", "modalidad", "all");
  const [statusFilter, setStatusFilter] = useTableFilter<
    CommercialInvoiceCollectionStatus | "all"
  >("/commercial-invoices", "estadoCobro", "all");

  const tableColumns = useTableColumnVisibility("commercial-invoices");
  const [sort, setSort] = useState<TableSortState<InvoiceSortKey>>(null);

  const reloadInvoices = useCallback(async () => {
    try {
      const data = await fetchCommercialInvoices();
      setInvoices(data);
      setListError(null);
    } catch (err) {
      reportListTableError({
        message: getCommercialInvoicesErrorMessage(err),
        setListError,
        toast,
      });
    }
  }, [toast]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    void (async () => {
      try {
        const data = await fetchCommercialInvoices();
        if (!active) return;
        setInvoices(data);
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

  const filteredInvoices = useMemo(() => {
    const q = search.trim().toLowerCase();
    return invoices.filter((invoice) => {
      if (modalityFilter !== "all" && invoice.modalidad !== modalityFilter) {
        return false;
      }
      if (statusFilter !== "all" && invoice.estadoCobro !== statusFilter) {
        return false;
      }
      if (!q) return true;
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
        invoice.distribuidorNombre,
        invoice.clienteNombre,
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
  }, [invoices, search, modalityFilter, statusFilter]);

  const sortedInvoices = useMemo(
    () =>
      sortTableRows(filteredInvoices, sort, {
        id: (a, b) => compareNumberValues(a.id, b.id),
        createdAt: (a, b) => compareDateValues(a.createdAt, b.createdAt),
        numeroFactura: (a, b) =>
          (a.numeroFactura ?? "").localeCompare(b.numeroFactura ?? "", "es", {
            numeric: true,
          }),
        paidAmountTotal: (a, b) =>
          compareNumberValues(a.paidAmountTotal, b.paidAmountTotal),
        printerCount: (a, b) =>
          compareNumberValues(a.printerCount, b.printerCount),
      }),
    [filteredInvoices, sort],
  );

  const pagination = usePagination(sortedInvoices, undefined, {
    section: "/commercial-invoices",
  });

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
      await reloadInvoices();
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
      await reloadInvoices();
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
    <div className="admin-content-stack">
      <PageToolbar
        actions={
          canCreate ? (
            <button
              type="button"
              onClick={openCreate}
              className={cn(
                pageToolbarButtonClass,
                "bg-accent text-accent-foreground",
              )}
            >
              <Plus className="size-4" />
              Nueva factura comercial
            </button>
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
            Cargando facturas comerciales…
          </div>
        ) : invoices.length === 0 ? (
          <EmptyState title="No hay facturas comerciales registradas." />
        ) : (
          <>
            <DataTableToolbar
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder="Buscar por N° factura, sufijo, cliente, notas…"
              resultCount={filteredInvoices.length}
              totalCount={invoices.length}
              filters={[
                {
                  id: "modalidad",
                  label: "Modalidad",
                  value: modalityFilter,
                  onChange: (value) =>
                    setModalityFilter(
                      value as CommercialInvoiceModality | "all",
                    ),
                  options: [
                    filterAllOption(),
                    ...COMMERCIAL_INVOICE_MODALITIES.map((modality) => ({
                      value: modality,
                      label: COMMERCIAL_INVOICE_MODALITY_LABELS[modality],
                    })),
                  ],
                },
                {
                  id: "estadoCobro",
                  label: "Estado de cobro",
                  value: statusFilter,
                  onChange: (value) =>
                    setStatusFilter(
                      value as CommercialInvoiceCollectionStatus | "all",
                    ),
                  options: [
                    filterAllOption(),
                    ...COMMERCIAL_INVOICE_COLLECTION_STATUSES.map((status) => ({
                      value: status,
                      label: COMMERCIAL_INVOICE_COLLECTION_STATUS_LABELS[status],
                    })),
                  ],
                },
              ]}
              columns={tableColumns.toolbarColumns}
            />
            {filteredInvoices.length === 0 ? (
              <TableFilterEmptyState />
            ) : (
              <>
                <TableScroll>
                  <table className="w-full min-w-[640px] text-left text-sm">
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
                          <th className="px-5 py-3 font-medium">
                            Distribuidor / Cliente
                          </th>
                          <th className="px-5 py-3 font-medium">Modalidad</th>
                          <th className="px-5 py-3 font-medium">
                            Estado de cobro
                          </th>
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
                              <td className="max-w-[220px] px-5 py-3.5 text-card-foreground">
                                <TruncatedText maxClassName="max-w-[200px]">
                                  {invoice.clienteComercialNombre ?? "—"}
                                </TruncatedText>
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
        open={dialog === "create" || dialog === "edit"}
        saving={saving}
        error={formError}
        onClose={closeDialog}
        onSubmit={(values) => void handleSubmit(values)}
      />
    </div>
  );
}
