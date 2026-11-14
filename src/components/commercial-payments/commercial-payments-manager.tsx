"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { CommercialPaymentFormDialog } from "@/components/commercial-payments/commercial-payment-form-dialog";
import { CommercialPaymentMethodBadge } from "@/components/commercial-payments/commercial-payment-method-badge";
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
  canCreateCommercialPaymentRecord,
  canDeleteCommercialPaymentRecord,
  canModifyCommercialPaymentRecord,
} from "@/lib/api-permissions";
import { formatCommercialInvoiceTitle } from "@/lib/commercial-invoice-form";
import { fetchCommercialInvoices } from "@/lib/commercial-invoices-api";
import {
  COMMERCIAL_PAYMENT_METHOD_LABELS,
  toCommercialPaymentRequest,
} from "@/lib/commercial-payment-form";
import {
  createCommercialPayment,
  deleteCommercialPayment,
  fetchCommercialPayments,
  getCommercialPaymentsErrorMessage,
  updateCommercialPayment,
} from "@/lib/commercial-payments-api";
import { formatDate, formatMoney } from "@/lib/datetime-form";
import { forbiddenMessage } from "@/lib/permissions/messages";
import {
  commercialInvoicePath,
  commercialPaymentPath,
} from "@/lib/resource-routes";
import { hrefForCommercialInvoice } from "@/lib/table-foreign-hrefs";
import { filterAllOption } from "@/lib/table-filter-options";
import {
  compareDateValues,
  compareNumberValues,
  sortTableRows,
  toggleTableSort,
  type TableSortState,
} from "@/lib/table-sort";
import { cn } from "@/lib/utils";
import type { CommercialInvoiceResponse } from "@/types/commercial-invoice";
import {
  COMMERCIAL_PAYMENT_METHODS,
  type CommercialPaymentFormValues,
  type CommercialPaymentMethod,
  type CommercialPaymentResponse,
} from "@/types/commercial-payment";

type PaymentSortKey = "id" | "createdAt" | "monto";

export function CommercialPaymentsManager() {
  const toast = useToast();
  const confirm = useConfirm();
  const { user } = useAuth();
  const canCreate = user ? canCreateCommercialPaymentRecord(user.role) : false;
  const canModify = user ? canModifyCommercialPaymentRecord(user.role) : false;
  const canDelete = user ? canDeleteCommercialPaymentRecord(user.role) : false;

  const [payments, setPayments] = useState<CommercialPaymentResponse[]>([]);
  const [invoices, setInvoices] = useState<CommercialInvoiceResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [invoicesLoading, setInvoicesLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [dialog, setDialog] = useState<"create" | "edit" | null>(null);
  const [selected, setSelected] = useState<CommercialPaymentResponse | null>(
    null,
  );
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [search, setSearch] = useTableSearch("/commercial-payments");
  const [methodFilter, setMethodFilter] = useTableFilter<
    CommercialPaymentMethod | "all"
  >("/commercial-payments", "metodoBanco", "all");
  const [invoiceFilter, setInvoiceFilter] = useTableFilter(
    "/commercial-payments",
    "facturaComercial",
    "all",
  );

  const tableColumns = useTableColumnVisibility("commercial-payments");
  const [sort, setSort] = useState<TableSortState<PaymentSortKey>>(null);

  const reloadPayments = useCallback(async () => {
    try {
      const [paymentsData, invoicesData] = await Promise.all([
        fetchCommercialPayments(),
        fetchCommercialInvoices().catch(() => []),
      ]);
      setPayments(paymentsData);
      if (invoicesData.length > 0) setInvoices(invoicesData);
      setListError(null);
    } catch (err) {
      reportListTableError({
        message: getCommercialPaymentsErrorMessage(err),
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
        const [paymentsData, invoicesData] = await Promise.all([
          fetchCommercialPayments(),
          fetchCommercialInvoices().catch(() => []),
        ]);
        if (!active) return;
        setPayments(paymentsData);
        setInvoices(invoicesData);
        setListError(null);
      } catch (err) {
        if (!active) return;
        reportListTableError({
          message: getCommercialPaymentsErrorMessage(err),
          setListError,
          toast,
        });
      } finally {
        if (active) {
          setLoading(false);
          setInvoicesLoading(false);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [toast, user]);

  const invoiceById = useMemo(
    () => new Map(invoices.map((inv) => [inv.id, inv])),
    [invoices],
  );

  const invoiceFilterOptions = useMemo(
    () => [
      filterAllOption("Todas las facturas"),
      ...invoices.map((inv) => ({
        value: String(inv.id),
        label: formatCommercialInvoiceTitle(inv),
        searchText: [
          String(inv.id),
          inv.numeroFactura,
          inv.sufijoControl,
          inv.facturaCliente,
        ]
          .filter(Boolean)
          .join(" "),
      })),
    ],
    [invoices],
  );

  const filteredPayments = useMemo(() => {
    const q = search.trim().toLowerCase();
    return payments.filter((payment) => {
      if (methodFilter !== "all" && payment.metodoBanco !== methodFilter) {
        return false;
      }
      if (
        invoiceFilter !== "all" &&
        String(payment.facturaComercialId) !== invoiceFilter
      ) {
        return false;
      }
      if (!q) return true;
      const methodLabel =
        COMMERCIAL_PAYMENT_METHOD_LABELS[payment.metodoBanco] ??
        payment.metodoBanco;
      const linkedInvoice = invoiceById.get(payment.facturaComercialId);
      const haystack = [
        payment.id,
        payment.facturaComercialId,
        payment.numeroFactura,
        linkedInvoice?.sufijoControl,
        payment.facturaCliente ?? linkedInvoice?.facturaCliente,
        payment.metodoBanco,
        methodLabel,
        payment.referencia,
        payment.cuentaDestino,
        payment.monto != null ? String(payment.monto) : null,
        payment.createdAt,
        formatDate(payment.createdAt),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [payments, search, methodFilter, invoiceFilter, invoiceById]);

  const sortedPayments = useMemo(
    () =>
      sortTableRows(filteredPayments, sort, {
        id: (a, b) => compareNumberValues(a.id, b.id),
        createdAt: (a, b) => compareDateValues(a.createdAt, b.createdAt),
        monto: (a, b) => compareNumberValues(a.monto, b.monto),
      }),
    [filteredPayments, sort],
  );

  const pagination = usePagination(sortedPayments, undefined, {
    section: "/commercial-payments",
  });

  function openCreate() {
    setSelected(null);
    setFormError(null);
    setDialog("create");
  }

  function openEdit(payment: CommercialPaymentResponse) {
    setSelected(payment);
    setFormError(null);
    setDialog("edit");
  }

  function closeDialog() {
    setDialog(null);
    setSelected(null);
    setFormError(null);
  }

  async function handleSubmit(values: CommercialPaymentFormValues) {
    if (dialog === "create" && !canCreate) {
      setFormError(forbiddenMessage("create", "commercialPayments"));
      return;
    }
    if (dialog === "edit" && !canModify) {
      setFormError(forbiddenMessage("update", "commercialPayments"));
      return;
    }

    const bodyOrError = toCommercialPaymentRequest(values);
    if (typeof bodyOrError === "string") {
      setFormError(bodyOrError);
      return;
    }

    setSaving(true);
    setFormError(null);

    try {
      if (dialog === "create") {
        const created = await createCommercialPayment(bodyOrError);
        toast.success("Pago comercial registrado.", {
          href: commercialPaymentPath(created.id),
        });
      } else if (selected) {
        await updateCommercialPayment(selected.id, bodyOrError);
        toast.success("Pago comercial actualizado.", {
          href: commercialPaymentPath(selected.id),
        });
      }
      closeDialog();
      await reloadPayments();
    } catch (err) {
      const message = getCommercialPaymentsErrorMessage(err);
      setFormError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(payment: CommercialPaymentResponse) {
    if (!canDelete) {
      toast.error(forbiddenMessage("delete", "commercialPayments"));
      return;
    }
    const refLabel = payment.referencia
      ? `con referencia ${payment.referencia}`
      : `#${payment.id}`;
    if (
      !(await confirm({
        title: "Confirmar",
        message: `¿Eliminar el pago comercial ${refLabel}?`,
        destructive: true,
      }))
    ) {
      return;
    }
    setDeletingId(payment.id);
    try {
      await deleteCommercialPayment(payment.id);
      toast.success("Pago comercial eliminado.");
      await reloadPayments();
    } catch (err) {
      reportListTableError({
        message: getCommercialPaymentsErrorMessage(err),
        recordLabel: `Pago ${refLabel}`,
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
              Nuevo pago comercial
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
            Cargando pagos comerciales…
          </div>
        ) : payments.length === 0 ? (
          <EmptyState title="No hay pagos comerciales registrados." />
        ) : (
          <>
            <DataTableToolbar
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder="Buscar por factura, cliente, referencia, cuenta destino…"
              resultCount={filteredPayments.length}
              totalCount={payments.length}
              filters={[
                {
                  id: "metodoBanco",
                  label: "Método / Banco",
                  value: methodFilter,
                  onChange: (value) =>
                    setMethodFilter(value as CommercialPaymentMethod | "all"),
                  options: [
                    filterAllOption(),
                    ...COMMERCIAL_PAYMENT_METHODS.map((method) => ({
                      value: method,
                      label: COMMERCIAL_PAYMENT_METHOD_LABELS[method],
                    })),
                  ],
                },
                {
                  id: "facturaComercial",
                  label: "Factura comercial",
                  value: invoiceFilter,
                  onChange: setInvoiceFilter,
                  options: invoiceFilterOptions,
                  searchable: true,
                  searchPlaceholder: "Buscar por N° factura o cliente…",
                },
              ]}
              columns={tableColumns.toolbarColumns}
            />
            {filteredPayments.length === 0 ? (
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
                          <th className="px-5 py-3 font-medium">
                            Factura comercial
                          </th>
                          <th className="px-5 py-3 font-medium">
                            Cliente (factura)
                          </th>
                          <th className="px-5 py-3 font-medium">
                            Método / Banco
                          </th>
                          <SortableTableHeader
                            label="Monto"
                            sortDirection={
                              sort?.key === "monto" ? sort.direction : null
                            }
                            onToggle={() =>
                              setSort((current) =>
                                toggleTableSort(current, "monto"),
                              )
                            }
                          />
                          <th className="px-5 py-3 font-medium">Referencia</th>
                        </TableRowMetaHeaders>
                      </tr>
                    </thead>
                    <tbody>
                      {pagination.paginatedItems.map((payment) => {
                        const linked = invoiceById.get(
                          payment.facturaComercialId,
                        );
                        const invoiceLabel = formatCommercialInvoiceTitle({
                          id: payment.facturaComercialId,
                          numeroFactura:
                            payment.numeroFactura ?? linked?.numeroFactura,
                          sufijoControl: linked?.sufijoControl,
                        });
                        const invoiceHref = user
                          ? hrefForCommercialInvoice(
                              payment.facturaComercialId,
                              user.role,
                            )
                          : commercialInvoicePath(payment.facturaComercialId);

                        return (
                          <ClickableTableRow
                            key={payment.id}
                            href={commercialPaymentPath(payment.id)}
                          >
                            <TableRowMetaCells
                              showId={tableColumns.showId}
                              showCreatedAt={tableColumns.showCreatedAt}
                              id={payment.id}
                              createdAt={payment.createdAt}
                              actions={
                                <td
                                  className="px-5 py-3.5"
                                  data-row-click="ignore"
                                >
                                  <TableRowActionsMenu
                                    viewHref={commercialPaymentPath(payment.id)}
                                    viewLabel={`Ver pago #${payment.id}`}
                                    onEdit={
                                      canModify
                                        ? () => openEdit(payment)
                                        : undefined
                                    }
                                    onDelete={
                                      canDelete
                                        ? () => void handleDelete(payment)
                                        : undefined
                                    }
                                    deleting={deletingId === payment.id}
                                  />
                                </td>
                              }
                            >
                              <td className="max-w-[200px] px-5 py-3.5">
                                <TruncatedText
                                  href={invoiceHref}
                                  mono
                                  maxClassName="max-w-[180px]"
                                  className="font-medium text-card-foreground"
                                >
                                  {invoiceLabel}
                                </TruncatedText>
                              </td>
                              <td className="max-w-[200px] px-5 py-3.5 text-muted">
                                <TruncatedText maxClassName="max-w-[180px]">
                                  {payment.facturaCliente ??
                                    linked?.facturaCliente ??
                                    "—"}
                                </TruncatedText>
                              </td>
                              <td className="px-5 py-3.5">
                                <CommercialPaymentMethodBadge
                                  method={payment.metodoBanco}
                                />
                              </td>
                              <td className="px-5 py-3.5 font-mono font-medium text-card-foreground">
                                {formatMoney(payment.monto)}
                              </td>
                              <td className="max-w-[180px] px-5 py-3.5 font-mono text-muted">
                                <TruncatedText
                                  mono
                                  maxClassName="max-w-[160px]"
                                >
                                  {payment.referencia ?? "—"}
                                </TruncatedText>
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

      <CommercialPaymentFormDialog
        mode={dialog === "create" ? "create" : "edit"}
        payment={selected ?? undefined}
        invoices={invoices}
        invoicesLoading={invoicesLoading}
        open={dialog === "create" || dialog === "edit"}
        saving={saving}
        error={formError}
        onClose={closeDialog}
        onSubmit={(values) => void handleSubmit(values)}
      />
    </div>
  );
}
