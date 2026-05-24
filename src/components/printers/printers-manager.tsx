"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Layers, Loader2, Plus } from "lucide-react";
import {
  PrinterBatchFormDialog,
  type PrinterBatchSubmitPayload,
} from "@/components/printers/printer-batch-form-dialog";
import { PrinterCreateWizardDialog } from "@/components/printers/printer-create-wizard-dialog";
import {
  type SelectOption,
} from "@/components/printers/printer-form-dialog";
import { runSerialBatch } from "@/lib/batch-create";
import { PrinterStatusBadge } from "@/components/printers/printer-status-badge";
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
import { useAuth } from "@/context/auth-provider";
import { useCompanyScope } from "@/context/company-scope-provider";
import {
  canCreatePrinterRecord,
  canModifyPrinterRecord,
  CATALOG_MODIFY_FORBIDDEN_MESSAGE,
} from "@/lib/api-permissions";
import { useToast } from "@/context/toast-provider";
import { useConfirm } from "@/context/confirm-provider";
import { usePagination } from "@/hooks/use-pagination";
import { useTableColumnVisibility } from "@/hooks/use-table-column-visibility";
import {
  compareDateValues,
  compareNumberValues,
  sortTableRows,
  toggleTableSort,
  type TableSortState,
} from "@/lib/table-sort";
import { distributorLabel } from "@/lib/branch-roles";
import { formatBranchShort } from "@/lib/branches";
import { fetchBranches } from "@/lib/branches-api";
import { fetchClients } from "@/lib/clients-api";
import { fetchCompanies } from "@/lib/companies-api";
import { fetchDistributors } from "@/lib/distributors-api";
import {
  DEVICE_TYPE_LABELS,
  formatPrinterDate,
  formatPrinterPrice,
  printerModelLabel,
  printerToFormValues,
  PRINTER_STATUS_LABELS,
  toPrinterRequest,
  type PrinterFormValues,
} from "@/lib/printer-form";
import { fetchPrinterModels } from "@/lib/printer-models-api";
import {
  createPrinter,
  deletePrinter,
  fetchPrinters,
  getPrintersErrorMessage,
  updatePrinter,
} from "@/lib/printers-api";
import { fetchAuthMe } from "@/lib/auth-me-api";
import { filterPrinterModelsForDistributor } from "@/lib/distributor-scope";
import { fetchSoftware } from "@/lib/software-api";
import type { BranchResponse } from "@/types/branch";
import type { ClientResponse, DistributorResponse } from "@/types/branch-role";
import type { CompanyResponse } from "@/types/company";
import type { PrinterModelResponse } from "@/types/printer-model";
import type { PrinterResponse, PrinterStatus } from "@/types/printer";
import { PRINTER_STATUSES } from "@/types/printer";
import { cn } from "@/lib/utils";
import { TableScroll } from "@/components/ui/table-scroll";
import { TruncatedText } from "@/components/ui/truncated-text";
import { SortableTableHeader } from "@/components/ui/sortable-table-header";
import { printerPath } from "@/lib/resource-routes";
import {
  hrefForClient,
  hrefForDistributor,
  hrefForPrinterModel,
} from "@/lib/table-foreign-hrefs";
import { ClickableTableRow } from "@/components/ui/clickable-table-row";
import { TableRowActionsMenu } from "@/components/ui/table-row-actions-menu";

type PrinterSortKey = "price" | "installationDate" | "id" | "createdAt";

function clientLabel(
  client: ClientResponse,
  branches: BranchResponse[],
  companies: CompanyResponse[],
): string {
  const branch = branches.find((b) => b.id === client.branchId);
  if (!branch) return "Cliente desconocido";
  return formatBranchShort(branch, companies);
}

export function PrintersManager() {
  const toast = useToast();
  const confirm = useConfirm();
  const { user } = useAuth();
  const { scope } = useCompanyScope();
  const canCreate = user ? canCreatePrinterRecord(user.role) : false;
  const canModify = user ? canModifyPrinterRecord(user.role) : false;
  const isDistributor = user?.role === "DISTRIBUTOR";
  const [resolvedDistributorId, setResolvedDistributorId] = useState<
    number | null
  >(user?.distributorId ?? null);
  const distributorId = resolvedDistributorId;
  const lockDistributor = isDistributor && distributorId != null;

  const [printers, setPrinters] = useState<PrinterResponse[]>([]);
  const [models, setModels] = useState<PrinterModelResponse[]>([]);
  const [software, setSoftware] = useState<SelectOption[]>([]);
  const [branches, setBranches] = useState<BranchResponse[]>([]);
  const [companies, setCompanies] = useState<CompanyResponse[]>([]);
  const [distributors, setDistributors] = useState<DistributorResponse[]>([]);
  const [clients, setClients] = useState<ClientResponse[]>([]);

  const [loading, setLoading] = useState(true);
  const [modelsLoading, setModelsLoading] = useState(true);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [dialog, setDialog] = useState<"create" | "edit" | "batch" | null>(null);
  const [selected, setSelected] = useState<PrinterResponse | null>(null);
  const [saving, setSaving] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{
    done: number;
    total: number;
  } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const tableColumns = useTableColumnVisibility("printers");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<PrinterStatus | "all">(
    "all",
  );
  const [modelFilter, setModelFilter] = useState("all");
  const [paidFilter, setPaidFilter] = useState("all");
  const [sort, setSort] = useState<TableSortState<PrinterSortKey>>(null);

  useEffect(() => {
    if (!isDistributor) {
      setResolvedDistributorId(null);
      return;
    }
    if (user?.distributorId != null) {
      setResolvedDistributorId(user.distributorId);
      return;
    }
    let cancelled = false;
    fetchAuthMe()
      .then((me) => {
        if (!cancelled) setResolvedDistributorId(me.distributorId ?? null);
      })
      .catch(() => {
        if (!cancelled) setResolvedDistributorId(null);
      });
    return () => {
      cancelled = true;
    };
  }, [isDistributor, user?.distributorId]);

  const visiblePrinters = useMemo(() => {
    if (!isDistributor) return printers;
    if (distributorId == null) return [];
    return printers.filter((p) => p.distributorId === distributorId);
  }, [printers, isDistributor, distributorId]);

  const visibleModels = useMemo(() => {
    if (!isDistributor) return models;
    return filterPrinterModelsForDistributor(models, visiblePrinters);
  }, [models, isDistributor, visiblePrinters]);

  const modelById = useMemo(
    () => new Map(visibleModels.map((m) => [m.id, m])),
    [visibleModels],
  );

  const modelFilterOptions = useMemo(
    () => [
      filterAllOption("Todos los modelos"),
      ...visibleModels.map((model) => ({
        value: String(model.id),
        label: printerModelLabel(model),
      })),
    ],
    [visibleModels],
  );

  const paidFilterOptions = useMemo(
    () => [
      filterAllOption(),
      { value: "yes", label: "Pagadas" },
      { value: "no", label: "No pagadas" },
    ],
    [],
  );

  const filteredPrinters = useMemo(() => {
    const q = search.trim().toLowerCase();
    return visiblePrinters.filter((printer) => {
      if (statusFilter !== "all" && printer.status !== statusFilter) {
        return false;
      }
      if (
        modelFilter !== "all" &&
        printer.modelId !== Number(modelFilter)
      ) {
        return false;
      }
      if (paidFilter === "yes" && !printer.paid) return false;
      if (paidFilter === "no" && printer.paid) return false;
      if (!q) return true;
      const model = modelById.get(printer.modelId);
      const haystack = [
        printer.id,
        printer.fiscalSerial,
        printer.modelId,
        model ? printerModelLabel(model) : "",
        printer.status,
        printer.deviceType,
        printer.distributorId,
        printer.clientId,
        printer.macAddress,
        printer.versionFirmware,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [visiblePrinters, search, statusFilter, modelFilter, paidFilter, modelById]);

  const sortedPrinters = useMemo(
    () =>
      sortTableRows(filteredPrinters, sort, {
        price: (a, b) => compareNumberValues(a.finalSalePrice, b.finalSalePrice),
        installationDate: (a, b) =>
          compareDateValues(a.installationDate, b.installationDate),
        id: (a, b) => compareNumberValues(a.id, b.id),
        createdAt: (a, b) => compareDateValues(a.createdAt, b.createdAt),
      }),
    [filteredPrinters, sort],
  );

  const pagination = usePagination(sortedPrinters);

  const modelOptions = useMemo<SelectOption[]>(
    () =>
      [...visibleModels]
        .sort((a, b) =>
          printerModelLabel(a).localeCompare(printerModelLabel(b), "es"),
        )
        .map((m) => ({ id: m.id, label: printerModelLabel(m) })),
    [visibleModels],
  );

  const scopedClients = useMemo(() => {
    if (!isDistributor || distributorId == null) return clients;
    return clients.filter((c) => c.distributorId === distributorId);
  }, [clients, isDistributor, distributorId]);

  const distributorOptions = useMemo<SelectOption[]>(() => {
    const rows =
      lockDistributor && distributorId != null
        ? distributors.filter((d) => d.id === distributorId)
        : distributors;
    return rows
      .map((d) => ({
        id: d.id,
        label: distributorLabel(d, branches, companies),
      }))
      .sort((a, b) => a.label.localeCompare(b.label, "es"));
  }, [distributors, branches, companies, lockDistributor, distributorId]);

  const clientOptions = useMemo<SelectOption[]>(
    () =>
      scopedClients
        .map((c) => ({
          id: c.id,
          label: clientLabel(c, branches, companies),
        }))
        .sort((a, b) => a.label.localeCompare(b.label, "es")),
    [scopedClients, branches, companies],
  );

  const loadPrinters = useCallback(async () => {
    setLoading(true);
    setListError(null);
    try {
      const data = await fetchPrinters();
      setPrinters(
        data.sort((a, b) => b.createdAt.localeCompare(a.createdAt, "es")),
      );
    } catch (err) {
      const message = getPrintersErrorMessage(err);
      setListError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const loadCatalog = useCallback(async () => {
    setCatalogLoading(true);
    setModelsLoading(true);
    try {
      const [companyRows, branchRows, distributorRows, clientRows, modelRows] =
        await Promise.all([
          scope ? Promise.resolve(scope.companies) : fetchCompanies(),
          scope ? Promise.resolve(scope.branches) : fetchBranches(),
          fetchDistributors(),
          fetchClients(),
          fetchPrinterModels().catch(() => [] as PrinterModelResponse[]),
        ]);
      setCompanies(
        [...companyRows].sort((a, b) =>
          (a.businessName || "").localeCompare(b.businessName || "", "es"),
        ),
      );
      setBranches(branchRows);
      setDistributors(distributorRows);
      setClients(clientRows);
      setModels(modelRows);
    } finally {
      setCatalogLoading(false);
      setModelsLoading(false);
    }

    if (user?.role === "ADMIN") {
      try {
        const sw = await fetchSoftware();
        setSoftware(
          sw
            .map((s) => ({
              id: s.id,
              label: `${s.name} v${s.version}`,
            }))
            .sort((a, b) => a.label.localeCompare(b.label, "es")),
        );
      } catch {
        setSoftware([]);
      }
    }
  }, [scope, user?.role]);

  useEffect(() => {
    loadPrinters();
  }, [loadPrinters]);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  function getModelLabel(modelId: number): string {
    const model = modelById.get(modelId);
    return model ? printerModelLabel(model) : "Modelo desconocido";
  }

  function getDistributorLabel(distributorId: number | null): string {
    if (distributorId == null) return "—";
    const d = distributors.find((x) => x.id === distributorId);
    if (!d) return "—";
    return distributorLabel(d, branches, companies);
  }

  function getClientLabel(clientId: number | null): string {
    if (clientId == null) return "—";
    const c = clients.find((x) => x.id === clientId);
    if (!c) return "—";
    return clientLabel(c, branches, companies);
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

  function openEdit(printer: PrinterResponse) {
    setSelected(printer);
    setFormError(null);
    setDialog("edit");
  }

  function closeDialog() {
    setDialog(null);
    setSelected(null);
    setFormError(null);
    setBatchProgress(null);
  }

  async function handleBatchSubmit({ serials, base }: PrinterBatchSubmitPayload) {
    if (!canCreate) {
      setFormError(CATALOG_MODIFY_FORBIDDEN_MESSAGE);
      return;
    }

    if (!(await confirm({ title: "Confirmar", message: `¿Crear ${serials.length} impresora${serials.length === 1 ? "" : "s"} con seriales del rango indicado?`, destructive: true }))) {
      return;
    }

    setSaving(true);
    setFormError(null);
    setBatchProgress({ done: 0, total: serials.length });

    const result = await runSerialBatch(
      serials,
      async (fiscalSerial) => {
        const bodyOrError = toPrinterRequest({ ...base, fiscalSerial });
        if (typeof bodyOrError === "string") {
          throw new Error(bodyOrError);
        }
        if (lockDistributor && distributorId != null) {
          bodyOrError.distributorId = distributorId;
        }
        await createPrinter(bodyOrError);
      },
      (p) => setBatchProgress({ done: p.done, total: p.total }),
    );

    setSaving(false);
    setBatchProgress(null);

    if (result.succeeded > 0) {
      toast.success(
        `${result.succeeded} impresora${result.succeeded === 1 ? "" : "s"} creada${result.succeeded === 1 ? "" : "s"}.`,
      );
      await loadPrinters();
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

  async function handleSubmit(values: PrinterFormValues) {
    if (dialog === "create" && !canCreate) {
      setFormError(CATALOG_MODIFY_FORBIDDEN_MESSAGE);
      return;
    }
    if (dialog === "edit" && !canModify) {
      setFormError(CATALOG_MODIFY_FORBIDDEN_MESSAGE);
      return;
    }

    const bodyOrError = toPrinterRequest(values);
    if (typeof bodyOrError === "string") {
      setFormError(bodyOrError);
      return;
    }

    if (lockDistributor && distributorId != null) {
      bodyOrError.distributorId = distributorId;
    }

    setSaving(true);
    setFormError(null);

    try {
      if (dialog === "create") {
        const created = await createPrinter(bodyOrError);
        toast.success(`Impresora ${bodyOrError.fiscalSerial} creada.`, {
          href: printerPath(created.id),
        });
      } else if (selected) {
        await updatePrinter(selected.id, bodyOrError);
        toast.success("Impresora actualizada.", {
          href: printerPath(selected.id),
        });
      }
      closeDialog();
      await loadPrinters();
    } catch (err) {
      const message = getPrintersErrorMessage(err);
      setFormError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(printer: PrinterResponse, fromDialog = false) {
    if (!canModify) {
      toast.error(CATALOG_MODIFY_FORBIDDEN_MESSAGE);
      return;
    }
    if (!(await confirm({ title: "Confirmar", message: `¿Eliminar la impresora con serial ${printer.fiscalSerial}?`, destructive: true }))) {
      return;
    }
    setDeletingId(printer.id);
    try {
      await deletePrinter(printer.id);
      if (fromDialog) closeDialog();
      toast.success("Impresora eliminada.");
      await loadPrinters();
    } catch (err) {
      toast.error(getPrintersErrorMessage(err));
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
                  Nueva impresora
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
            Cargando impresoras…
          </div>
        ) : visiblePrinters.length === 0 ? (
          <EmptyState
            title={
              isDistributor
                ? "No hay impresoras asignadas a tu distribuidora."
                : "No hay impresoras registradas."
            }
          />
        ) : (
          <>
            <DataTableToolbar
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder="Buscar por serial, modelo, MAC…"
              resultCount={filteredPrinters.length}
              totalCount={visiblePrinters.length}
              filters={[
                {
                  id: "status",
                  label: "Estatus",
                  value: statusFilter,
                  onChange: (value) =>
                    setStatusFilter(value as PrinterStatus | "all"),
                  options: [
                    filterAllOption(),
                    ...PRINTER_STATUSES.map((status) => ({
                      value: status,
                      label: PRINTER_STATUS_LABELS[status],
                    })),
                  ],
                },
                {
                  id: "model",
                  label: "Modelo",
                  value: modelFilter,
                  onChange: setModelFilter,
                  options: modelFilterOptions,
                },
                {
                  id: "paid",
                  label: "Pago",
                  value: paidFilter,
                  onChange: setPaidFilter,
                  options: paidFilterOptions,
                },
              ]}
              columns={tableColumns.toolbarColumns}
            />
            {filteredPrinters.length === 0 ? (
              <TableFilterEmptyState />
            ) : (
              <>
                <TableScroll>
                  <table className="w-full min-w-[1100px] text-left text-sm">
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
                        <th className="px-5 py-3 font-medium">Modelo</th>
                        <th className="px-5 py-3 font-medium">Estatus</th>
                        <th className="px-5 py-3 font-medium">Tipo</th>
                        <th className="px-5 py-3 font-medium">Distribuidor</th>
                        <th className="px-5 py-3 font-medium">Cliente</th>
                        <SortableTableHeader
                          label="Precio"
                          sortDirection={sort?.key === "price" ? sort.direction : null}
                          onToggle={() =>
                            setSort((current) => toggleTableSort(current, "price"))
                          }
                        />
                        <th className="px-5 py-3 font-medium">Pagada</th>
                        <SortableTableHeader
                          label="Instalación"
                          sortDirection={
                            sort?.key === "installationDate" ? sort.direction : null
                          }
                          onToggle={() =>
                            setSort((current) =>
                              toggleTableSort(current, "installationDate"),
                            )
                          }
                        />
                        </TableRowMetaHeaders>
                      </tr>
                    </thead>
                    <tbody>
                      {pagination.paginatedItems.map((printer) => (
                        <ClickableTableRow
                          key={printer.id}
                          href={printerPath(printer.id)}
                        >
                          <TableRowMetaCells
                            showId={tableColumns.showId}
                            showCreatedAt={tableColumns.showCreatedAt}
                            id={printer.id}
                            createdAt={printer.createdAt}
                            actions={
                              <td className="px-5 py-3.5" data-row-click="ignore">
                                <TableRowActionsMenu
                                  viewHref={printerPath(printer.id)}
                                  viewLabel={`Ver impresora ${printer.fiscalSerial}`}
                                  onEdit={
                                    canModify ? () => openEdit(printer) : undefined
                                  }
                                  onDelete={
                                    canModify
                                      ? () => handleDelete(printer)
                                      : undefined
                                  }
                                  deleting={deletingId === printer.id}
                                />
                              </td>
                            }
                          >
                          <td className="px-5 py-3.5 font-mono font-medium text-card-foreground">
                            {printer.fiscalSerial}
                          </td>
                          <td className="max-w-[160px] px-5 py-3.5 text-card-foreground">
                            <TruncatedText
                              href={
                                user
                                  ? hrefForPrinterModel(
                                      printer.modelId,
                                      user.role,
                                    )
                                  : undefined
                              }
                              maxClassName="max-w-[140px]"
                            >
                              {getModelLabel(printer.modelId)}
                            </TruncatedText>
                          </td>
                          <td className="px-5 py-3.5">
                            <PrinterStatusBadge status={printer.status} />
                          </td>
                          <td className="px-5 py-3.5 text-muted">
                            {DEVICE_TYPE_LABELS[printer.deviceType] ??
                              printer.deviceType}
                          </td>
                          <td className="max-w-[160px] px-5 py-3.5 text-muted">
                            <TruncatedText
                              href={
                                user
                                  ? hrefForDistributor(
                                      printer.distributorId,
                                      distributors,
                                      user.role,
                                    )
                                  : undefined
                              }
                              maxClassName="max-w-[140px]"
                            >
                              {getDistributorLabel(printer.distributorId)}
                            </TruncatedText>
                          </td>
                          <td className="max-w-[160px] px-5 py-3.5 text-muted">
                            <TruncatedText
                              href={
                                user
                                  ? hrefForClient(
                                      printer.clientId,
                                      clients,
                                      user.role,
                                    )
                                  : undefined
                              }
                              maxClassName="max-w-[140px]"
                            >
                              {getClientLabel(printer.clientId)}
                            </TruncatedText>
                          </td>
                          <td className="px-5 py-3.5 text-muted">
                            {formatPrinterPrice(printer.finalSalePrice)}
                          </td>
                          <td className="px-5 py-3.5 text-muted">
                            {printer.paid ? "Sí" : "No"}
                          </td>
                          <td className="px-5 py-3.5 text-muted">
                            {formatPrinterDate(printer.installationDate)}
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

      <PrinterBatchFormDialog
        open={dialog === "batch"}
        saving={saving}
        progress={batchProgress}
        error={formError}
        modelOptions={modelOptions}
        softwareOptions={software}
        clientOptions={clientOptions}
        distributorOptions={distributorOptions}
        modelsLoading={modelsLoading}
        catalogLoading={catalogLoading}
        canPickSoftware={user?.role === "ADMIN"}
        lockDistributor={lockDistributor}
        defaultDistributorId={distributorId}
        onClose={closeDialog}
        onSubmit={(payload) => void handleBatchSubmit(payload)}
      />

      <PrinterCreateWizardDialog
        open={dialog === "create"}
        saving={saving}
        error={formError}
        modelOptions={modelOptions}
        softwareOptions={software}
        clientOptions={clientOptions}
        distributorOptions={distributorOptions}
        modelsLoading={modelsLoading}
        catalogLoading={catalogLoading}
        canPickSoftware={user?.role === "ADMIN"}
        lockDistributor={lockDistributor}
        defaultDistributorId={distributorId}
        onClose={closeDialog}
        onSubmit={handleSubmit}
      />

      <PrinterCreateWizardDialog
        mode="edit"
        open={dialog === "edit"}
        saving={saving}
        error={formError}
        initialValues={
          selected
            ? printerToFormValues(selected, {
                distributorId:
                  lockDistributor && distributorId != null
                    ? String(distributorId)
                    : undefined,
              })
            : null
        }
        modelOptions={modelOptions}
        softwareOptions={software}
        clientOptions={clientOptions}
        distributorOptions={distributorOptions}
        modelsLoading={modelsLoading}
        catalogLoading={catalogLoading}
        canPickSoftware={user?.role === "ADMIN"}
        lockDistributor={lockDistributor}
        defaultDistributorId={distributorId}
        onClose={closeDialog}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
