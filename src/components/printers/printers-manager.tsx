"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Layers, Loader2, Plus } from "lucide-react";
import {
  PrinterBatchFormDialog,
  type PrinterBatchSubmitPayload,
} from "@/components/printers/printer-batch-form-dialog";
import { PrinterAssignmentDialog } from "@/components/printers/printer-assignment-dialog";
import { PrinterCreateWizardDialog } from "@/components/printers/printer-create-wizard-dialog";
import { PrinterDispositionDialog } from "@/components/printers/printer-disposition-dialog";
import {
  type SelectOption,
} from "@/components/printers/printer-form-dialog";
import { runSerialBatch } from "@/lib/batch-create";
import { PrinterStatusBadge } from "@/components/printers/printer-status-badge";
import { PrinterPendingMqttBadge } from "@/components/printers/printer-pending-mqtt-badge";
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
import {
  DISTRIBUTOR_PRINTER_QUICK_FILTERS,
  DISTRIBUTOR_PRINTER_STATUSES,
  isDistributorPrinterQuickFilter,
  type DistributorPrinterQuickFilter,
} from "@/lib/distributor-printer-filters";
import { filterAllOption } from "@/lib/table-filter-options";
import { filterToggleButtonClass } from "@/lib/toggle-button-styles";
import { useAuth } from "@/context/auth-provider";
import { useCompanyScope } from "@/context/company-scope-provider";
import {
  canDisposePrinterRecord,
  canCreatePrinterRecord,
  canModifyPrinterRecord,
  CATALOG_MODIFY_FORBIDDEN_MESSAGE,
} from "@/lib/api-permissions";
import { useToast } from "@/context/toast-provider";
import { useConfirm } from "@/context/confirm-provider";
import { reportListTableError } from "@/lib/api-error-message";
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
  printerModelLabel,
  printerToAssignmentRequest,
  printerToFormValues,
  PRINTER_STATUS_LABELS,
  PRINTER_UNPAID_DISPOSITION_MESSAGE,
  isPrinterPaidForDisposition,
  toPrinterEditRequest,
  toPrinterRequest,
  type PrinterFormValues,
} from "@/lib/printer-form";
import { fetchPrinterModels } from "@/lib/printer-models-api";
import {
  fetchMissingPrinterModels,
  missingPrinterModelIds,
} from "@/lib/printer-models-catalog";
import {
  createPrinter,
  deletePrinter,
  fetchPrinters,
  getPrintersErrorMessage,
  updatePrinter,
} from "@/lib/printers-api";
import { fetchAuthMe } from "@/lib/auth-me-api";
import {
  DISTRIBUTOR_SELF_CLIENT_MESSAGE,
  excludeDistributorSelfClients,
  filterPrinterModelsForDistributor,
  isDistributorSelfClient,
} from "@/lib/distributor-scope";
import { useDistributorStaffBranchId } from "@/hooks/use-distributor-staff-branch-id";
import { fetchSoftware } from "@/lib/software-api";
import type { BranchResponse } from "@/types/branch";
import type { ClientResponse, DistributorResponse } from "@/types/branch-role";
import type { CompanyResponse } from "@/types/company";
import type { PrinterModelResponse } from "@/types/printer-model";
import type { PrinterResponse, PrinterStatus } from "@/types/printer";
import { isPrinterUnassigned } from "@/lib/printer-status";
import { getPrinterStatusQuickAction } from "@/lib/printer-quick-actions";
import { isPrinterPendingMqttEnajenacion } from "@/lib/printer-enajenacion-ticket";
import { PRINTER_STATUSES } from "@/types/printer";
import { cn } from "@/lib/utils";
import { TableScroll } from "@/components/ui/table-scroll";
import { TruncatedText } from "@/components/ui/truncated-text";
import { printerDispositionPath, printerPath } from "@/lib/resource-routes";
import { ClickableTableRow } from "@/components/ui/clickable-table-row";
import { TableRowActionsMenu } from "@/components/ui/table-row-actions-menu";

type PrinterSortKey = "id" | "createdAt";

function companyRifForBranch(
  branchId: number | null | undefined,
  branches: BranchResponse[],
  companies: CompanyResponse[],
): string {
  if (branchId == null) return "—";
  const branch = branches.find((b) => b.id === branchId);
  if (!branch) return "—";
  const rif = companies.find((c) => c.id === branch.companyId)?.rif?.trim();
  return rif || "—";
}

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
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const { user } = useAuth();
  const { scope } = useCompanyScope();
  const canCreate = user ? canCreatePrinterRecord(user.role) : false;
  const canModify = user ? canModifyPrinterRecord(user.role) : false;
  const isAdmin = user?.role === "ADMIN";
  const isDistributor = user?.role === "TECHNICIAN";
  const canAssignInitialized = isAdmin && canModify;
  const canDispose = user ? canDisposePrinterRecord(user.role) : false;
  const [authMeDistributorId, setAuthMeDistributorId] = useState<number | null>(
    null,
  );
  const distributorId = isDistributor
    ? (user?.distributorId ?? authMeDistributorId)
    : null;
  const lockDistributor = isDistributor && distributorId != null;
  const canDisposeAssigned =
    canDispose && (isAdmin || (isDistributor && distributorId != null));
  const distributorStaffBranchId = useDistributorStaffBranchId(
    isDistributor ? distributorId : null,
  );

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
  const [assignmentPrinter, setAssignmentPrinter] =
    useState<PrinterResponse | null>(null);
  const [assignmentSaving, setAssignmentSaving] = useState(false);
  const [assignmentError, setAssignmentError] = useState<string | null>(null);
  const [dispositionPrinter, setDispositionPrinter] =
    useState<PrinterResponse | null>(null);
  const [saving, setSaving] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{
    done: number;
    total: number;
  } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const tableColumns = useTableColumnVisibility("printers");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    PrinterStatus | "all" | DistributorPrinterQuickFilter
  >("all");

  const distributorStatusFilterOptions = useMemo(
    () => [
      filterAllOption("Todas"),
      ...DISTRIBUTOR_PRINTER_STATUSES.map((status) => ({
        value: status,
        label: PRINTER_STATUS_LABELS[status],
      })),
    ],
    [],
  );

  const adminStatusFilterOptions = useMemo(
    () => [
      filterAllOption(),
      ...PRINTER_STATUSES.map((status) => ({
        value: status,
        label: PRINTER_STATUS_LABELS[status],
      })),
    ],
    [],
  );
  const [sort, setSort] = useState<TableSortState<PrinterSortKey>>(null);

  useEffect(() => {
    if (!isDistributor || user?.distributorId != null) return;
    let cancelled = false;
    fetchAuthMe()
      .then((me) => {
        if (!cancelled) setAuthMeDistributorId(me.distributorId ?? null);
      })
      .catch(() => {
        if (!cancelled) setAuthMeDistributorId(null);
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
    () => new Map(models.map((m) => [m.id, m])),
    [models],
  );

  const filteredPrinters = useMemo(() => {
    const q = search.trim().toLowerCase();
    return visiblePrinters.filter((printer) => {
      if (statusFilter !== "all" && printer.status !== statusFilter) {
        return false;
      }
      if (!q) return true;
      const model = modelById.get(printer.modelId);
      const haystack = [
        printer.id,
        printer.fiscalSerial,
        printer.modelId,
        model ? printerModelLabel(model) : "",
        printer.status,
        printer.deviceType,
        ...(isDistributor ? [] : [printer.distributorId]),
        printer.clientId,
        printer.macAddress,
        printer.versionFirmware,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [
    visiblePrinters,
    search,
    statusFilter,
    modelById,
    isDistributor,
  ]);

  const sortedPrinters = useMemo(
    () =>
      sortTableRows(filteredPrinters, sort, {
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
    const forDistributor = clients.filter(
      (c) => c.distributorId === distributorId,
    );
    return excludeDistributorSelfClients(
      forDistributor,
      distributorStaffBranchId,
    );
  }, [clients, isDistributor, distributorId, distributorStaffBranchId]);

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

  const loadPrinters = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;
    if (!silent) {
      setLoading(true);
      setListError(null);
    }
    try {
      const data = await fetchPrinters();
      setPrinters(
        data.sort((a, b) => b.createdAt.localeCompare(a.createdAt, "es")),
      );
    } catch (err) {
      reportListTableError({
        message: getPrintersErrorMessage(err),
        setListError,
        toast,
      });
    } finally {
      if (!silent) setLoading(false);
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
          isDistributor
            ? Promise.resolve([] as DistributorResponse[])
            : fetchDistributors(),
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
  }, [scope, user?.role, isDistributor]);

  useEffect(() => {
    queueMicrotask(() => {
      void loadPrinters();
    });
  }, [loadPrinters]);

  useEffect(() => {
    queueMicrotask(() => {
      void loadCatalog();
    });
  }, [loadCatalog]);

  useEffect(() => {
    if (visiblePrinters.length === 0) return;
    if (missingPrinterModelIds(visiblePrinters, models).length === 0) return;

    let cancelled = false;
    void fetchMissingPrinterModels(visiblePrinters, models).then((next) => {
      if (
        !cancelled &&
        missingPrinterModelIds(visiblePrinters, next).length <
          missingPrinterModelIds(visiblePrinters, models).length
      ) {
        setModels(next);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [visiblePrinters, models]);

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

  function getDistributorRif(distributorId: number | null): string {
    if (distributorId == null) return "—";
    const distributor = distributors.find((d) => d.id === distributorId);
    if (!distributor) return "—";
    return companyRifForBranch(distributor.branchId, branches, companies);
  }

  function getClientRif(clientId: number | null): string {
    if (clientId == null) return "—";
    const client = clients.find((c) => c.id === clientId);
    if (!client) return "—";
    const embedded = client.companyRif?.trim();
    if (embedded) return embedded;
    return companyRifForBranch(client.branchId, branches, companies);
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

  function openAssignment(printer: PrinterResponse) {
    setAssignmentPrinter(printer);
    setAssignmentError(null);
  }

  function closeAssignment() {
    setAssignmentPrinter(null);
    setAssignmentError(null);
  }

  function openDisposition(printer: PrinterResponse) {
    if (!isPrinterPaidForDisposition(printer)) {
      toast.error(PRINTER_UNPAID_DISPOSITION_MESSAGE);
      return;
    }
    setDispositionPrinter(printer);
  }

  function closeDisposition() {
    setDispositionPrinter(null);
  }

  function handleDispositionContinue({
    clientId,
    facturaNro,
  }: {
    clientId: number;
    facturaNro: string;
  }) {
    if (!dispositionPrinter || !canDisposeAssigned) {
      toast.error(CATALOG_MODIFY_FORBIDDEN_MESSAGE);
      return;
    }
    if (!clientOptions.some((option) => option.id === clientId)) {
      toast.error("Selecciona un cliente válido.");
      return;
    }
    if (
      isDistributor &&
      isDistributorSelfClient(
        clientId,
        clients,
        distributorStaffBranchId,
      )
    ) {
      toast.error(DISTRIBUTOR_SELF_CLIENT_MESSAGE);
      return;
    }
    if (!isPrinterPaidForDisposition(dispositionPrinter)) {
      toast.error(PRINTER_UNPAID_DISPOSITION_MESSAGE);
      return;
    }
    const printerId = dispositionPrinter.id;
    closeDisposition();
    router.push(printerDispositionPath(printerId, clientId, facturaNro));
  }

  async function handleAssignmentSubmit({
    distributorId,
    paid,
  }: {
    distributorId: number;
    paid: boolean;
  }) {
    if (!assignmentPrinter || !canAssignInitialized) {
      toast.error(CATALOG_MODIFY_FORBIDDEN_MESSAGE);
      return;
    }
    if (!isPrinterUnassigned(assignmentPrinter.status)) {
      toast.error("Solo se pueden asignar impresoras con estatus Sin asignar.");
      return;
    }

    setAssignmentSaving(true);
    setAssignmentError(null);

    try {
      const body = printerToAssignmentRequest(
        assignmentPrinter,
        distributorId,
        paid,
      );
      await updatePrinter(assignmentPrinter.id, body);
      toast.success(
        `Impresora ${assignmentPrinter.fiscalSerial} asignada correctamente.`,
        { href: printerPath(assignmentPrinter.id) },
      );
      closeAssignment();
      await loadPrinters({ silent: true });
    } catch (err) {
      const message = getPrintersErrorMessage(err);
      setAssignmentError(message);
      toast.error(message);
    } finally {
      setAssignmentSaving(false);
    }
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

    const bodyOrError =
      dialog === "edit" && selected
        ? toPrinterEditRequest(values, selected)
        : toPrinterRequest(values, {
            finalSalePrice: selected?.finalSalePrice ?? null,
          });
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
      await loadPrinters({ silent: true });
    } catch (err) {
      reportListTableError({
        message: getPrintersErrorMessage(err),
        recordLabel: printer.fiscalSerial,
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
                ? "No hay impresoras en tu cartera."
                : "No hay impresoras registradas."
            }
          />
        ) : (
          <>
            {isDistributor ? (
              <div className="flex flex-wrap items-center gap-2 border-b border-border bg-foreground/[0.02] px-4 py-2.5 sm:px-5">
                <span className="mr-0.5 text-xs font-medium text-muted">
                  Filtros rápidos
                </span>
                {DISTRIBUTOR_PRINTER_QUICK_FILTERS.map((filter) => (
                  <button
                    key={filter.value}
                    type="button"
                    aria-pressed={statusFilter === filter.value}
                    onClick={() => setStatusFilter(filter.value)}
                    className={filterToggleButtonClass(
                      statusFilter === filter.value,
                      { className: "rounded-md" },
                    )}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            ) : null}
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
                  onChange: (value) => {
                    if (isDistributor) {
                      setStatusFilter(
                        isDistributorPrinterQuickFilter(value)
                          ? value
                          : "all",
                      );
                      return;
                    }
                    setStatusFilter(value as PrinterStatus | "all");
                  },
                  options: isDistributor
                    ? distributorStatusFilterOptions
                    : adminStatusFilterOptions,
                },
              ]}
              columns={tableColumns.toolbarColumns}
            />
            {filteredPrinters.length === 0 ? (
              <TableFilterEmptyState />
            ) : (
              <>
                <TableScroll>
                  <table
                    className={
                      isDistributor
                        ? "w-full min-w-[720px] text-left text-sm"
                        : "w-full min-w-[900px] text-left text-sm"
                    }
                  >
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
                        <th className="px-5 py-3 font-medium">Estatus</th>
                        {!isDistributor ? (
                          <th className="px-5 py-3 font-medium">Distribuidor</th>
                        ) : null}
                        <th className="px-5 py-3 font-medium">Cliente</th>
                        {isDistributor ? (
                          <th className="px-5 py-3 font-medium">RIF Cliente</th>
                        ) : (
                          <th className="px-5 py-3 font-medium">RIF Distribuidor</th>
                        )}
                        </TableRowMetaHeaders>
                      </tr>
                    </thead>
                    <tbody>
                      {pagination.paginatedItems.map((printer) => {
                        const statusQuickAction = getPrinterStatusQuickAction({
                          status: printer.status,
                          printer,
                          canAssign: canAssignInitialized,
                          canDispose: canDisposeAssigned,
                          onAssign: () => openAssignment(printer),
                          onDispose: () => openDisposition(printer),
                        });

                        return (
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
                          <td className="px-5 py-3.5" data-row-click="ignore">
                            <div className="flex flex-wrap items-center gap-2">
                              <PrinterStatusBadge
                                status={printer.status}
                                onClick={statusQuickAction?.onClick}
                                actionLabel={statusQuickAction?.label}
                              />
                              {isPrinterPendingMqttEnajenacion(printer) ? (
                                <PrinterPendingMqttBadge />
                              ) : null}
                            </div>
                          </td>
                          {!isDistributor ? (
                            <td className="max-w-[160px] px-5 py-3.5 text-muted">
                              <TruncatedText maxClassName="max-w-[140px]">
                                {getDistributorLabel(printer.distributorId)}
                              </TruncatedText>
                            </td>
                          ) : null}
                          <td className="max-w-[160px] px-5 py-3.5 text-muted">
                            <TruncatedText maxClassName="max-w-[140px]">
                              {getClientLabel(printer.clientId)}
                            </TruncatedText>
                          </td>
                          <td className="px-5 py-3.5 font-mono text-muted">
                            {isDistributor
                              ? getClientRif(printer.clientId)
                              : getDistributorRif(printer.distributorId)}
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

      {assignmentPrinter ? (
        <PrinterAssignmentDialog
          key={assignmentPrinter.id}
          printer={assignmentPrinter}
          saving={assignmentSaving}
          error={assignmentError}
          distributorOptions={distributorOptions}
          catalogLoading={catalogLoading}
          lockDistributor={lockDistributor}
          defaultDistributorId={distributorId}
          onClose={() => {
            if (!assignmentSaving) closeAssignment();
          }}
          onSubmit={(payload) => void handleAssignmentSubmit(payload)}
        />
      ) : null}

      {dispositionPrinter ? (
        <PrinterDispositionDialog
          key={dispositionPrinter.id}
          printer={dispositionPrinter}
          clientOptions={clientOptions}
          clients={scopedClients}
          branches={branches}
          companies={companies}
          distributors={distributors}
          catalogLoading={catalogLoading}
          onClose={closeDisposition}
          onContinue={handleDispositionContinue}
        />
      ) : null}

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
