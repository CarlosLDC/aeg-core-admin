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
import { runBatch, runSerialBatch } from "@/lib/batch-create";
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
import type {
  PrinterRequest,
  PrinterResponse,
  PrinterStatus,
} from "@/types/printer";
import { PRINTER_STATUSES } from "@/types/printer";
import { cn } from "@/lib/utils";
import { TableScroll } from "@/components/ui/table-scroll";
import { TruncatedText } from "@/components/ui/truncated-text";
import { SortableTableHeader } from "@/components/ui/sortable-table-header";
import { filterTabToggleClass } from "@/lib/toggle-button-styles";
import { printerPath } from "@/lib/resource-routes";
import {
  hrefForClient,
  hrefForDistributor,
  hrefForPrinterModel,
} from "@/lib/table-foreign-hrefs";
import { ClickableTableRow } from "@/components/ui/clickable-table-row";
import { TableRowActionsMenu } from "@/components/ui/table-row-actions-menu";

type PrinterSortKey = "price" | "installationDate" | "id" | "createdAt";
type PrinterViewMode = "inventory" | "assignment";

const printerModeButtonClass =
  "inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium transition";

type AssignmentProgress = {
  done: number;
  total: number;
  currentSerial: string;
};

function clientLabel(
  client: ClientResponse,
  branches: BranchResponse[],
  companies: CompanyResponse[],
): string {
  const branch = branches.find((b) => b.id === client.branchId);
  if (!branch) return "Cliente desconocido";
  return formatBranchShort(branch, companies);
}

function toPrinterAssignmentRequest(
  printer: PrinterResponse,
  distributorId: number,
): PrinterRequest {
  return {
    modelId: printer.modelId,
    softwareId: printer.softwareId,
    clientId: printer.clientId,
    distributorId,
    fiscalSerial: printer.fiscalSerial,
    finalSalePrice: printer.finalSalePrice,
    paid: printer.paid,
    installationDate: printer.installationDate,
    versionFirmware: printer.versionFirmware,
    macAddress: printer.macAddress,
    status: "asignada",
    deviceType: printer.deviceType,
  };
}

export function PrintersManager() {
  const toast = useToast();
  const confirm = useConfirm();
  const { user } = useAuth();
  const { scope } = useCompanyScope();
  const canCreate = user ? canCreatePrinterRecord(user.role) : false;
  const canModify = user ? canModifyPrinterRecord(user.role) : false;
  const isDistributor = user?.role === "DISTRIBUTOR";
  const [authMeDistributorId, setAuthMeDistributorId] = useState<number | null>(
    null,
  );
  const distributorId = isDistributor
    ? (user?.distributorId ?? authMeDistributorId)
    : null;
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
  const [viewMode, setViewMode] = useState<PrinterViewMode>("inventory");
  const [assignmentDistributorId, setAssignmentDistributorId] = useState("");
  const [assignmentSearch, setAssignmentSearch] = useState("");
  const [selectedAssignmentIds, setSelectedAssignmentIds] = useState<number[]>(
    [],
  );
  const [assignmentProgress, setAssignmentProgress] =
    useState<AssignmentProgress | null>(null);

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

  const assignablePrinters = useMemo(
    () => visiblePrinters.filter((printer) => printer.status === "inicializada"),
    [visiblePrinters],
  );

  const filteredAssignablePrinters = useMemo(() => {
    const q = assignmentSearch.trim().toLowerCase();
    if (!q) return assignablePrinters;
    return assignablePrinters.filter((printer) => {
      const model = modelById.get(printer.modelId);
      const haystack = [
        printer.id,
        printer.fiscalSerial,
        model ? printerModelLabel(model) : "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [assignablePrinters, assignmentSearch, modelById]);

  const selectedAssignablePrinters = useMemo(() => {
    const selectedSet = new Set(selectedAssignmentIds);
    return assignablePrinters.filter((printer) => selectedSet.has(printer.id));
  }, [assignablePrinters, selectedAssignmentIds]);

  const allVisibleAssignableSelected =
    filteredAssignablePrinters.length > 0 &&
    filteredAssignablePrinters.every((printer) =>
      selectedAssignmentIds.includes(printer.id),
    );

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
  const resolvedAssignmentDistributorId =
    assignmentDistributorId || String(distributorOptions[0]?.id ?? "");

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
    queueMicrotask(() => {
      void loadPrinters();
    });
  }, [loadPrinters]);

  useEffect(() => {
    queueMicrotask(() => {
      void loadCatalog();
    });
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

  function toggleAssignmentSelection(printerId: number, checked: boolean) {
    setSelectedAssignmentIds((current) => {
      if (checked) {
        return current.includes(printerId) ? current : [...current, printerId];
      }
      return current.filter((id) => id !== printerId);
    });
  }

  function toggleAllVisibleAssignable(checked: boolean) {
    setSelectedAssignmentIds((current) => {
      if (!checked) {
        const visibleIds = new Set(filteredAssignablePrinters.map((p) => p.id));
        return current.filter((id) => !visibleIds.has(id));
      }
      const next = new Set(current);
      filteredAssignablePrinters.forEach((printer) => next.add(printer.id));
      return [...next];
    });
  }

  async function handleAssignPrinters() {
    if (!canModify) {
      toast.error(CATALOG_MODIFY_FORBIDDEN_MESSAGE);
      return;
    }
    if (selectedAssignablePrinters.length === 0) {
      toast.error("Selecciona al menos una impresora para asignar.");
      return;
    }
    const distributorId = Number(resolvedAssignmentDistributorId);
    if (!Number.isFinite(distributorId) || distributorId <= 0) {
      toast.error("Selecciona una distribuidora válida.");
      return;
    }

    const distributorName = getDistributorLabel(distributorId);
    if (
      !(await confirm({
        title: "Confirmar asignación",
        message: `Asignar ${selectedAssignablePrinters.length} impresora${selectedAssignablePrinters.length === 1 ? "" : "s"} a \"${distributorName}\". Esta acción cambiará el estatus a \"Asignada\".`,
        destructive: true,
      }))
    ) {
      return;
    }

    setAssignmentProgress({
      done: 0,
      total: selectedAssignablePrinters.length,
      currentSerial: "",
    });

    const result = await runBatch(
      selectedAssignablePrinters,
      async (printer) => {
        const body = toPrinterAssignmentRequest(printer, distributorId);
        await updatePrinter(printer.id, body);
      },
      (printer) => printer.fiscalSerial,
      (progress) =>
        setAssignmentProgress({
          done: progress.done,
          total: progress.total,
          currentSerial: progress.currentLabel,
        }),
    );

    setAssignmentProgress(null);

    if (result.succeeded > 0) {
      toast.success(
        `${result.succeeded} impresora${result.succeeded === 1 ? "" : "s"} asignada${result.succeeded === 1 ? "" : "s"} correctamente.`,
      );
      await loadPrinters({ silent: true });
    }

    if (result.failed.length > 0) {
      const sample = result.failed
        .slice(0, 3)
        .map((f) => `${f.label}: ${f.message}`)
        .join(" · ");
      const more = result.failed.length > 3 ? ` (+${result.failed.length - 3} más)` : "";
      setListError(
        `No se pudieron asignar ${result.failed.length} impresora(s). ${sample}${more}`,
      );
      toast.error(
        `Asignación incompleta: ${result.failed.length} error${result.failed.length === 1 ? "" : "es"}.`,
      );
      return;
    }

    setSelectedAssignmentIds([]);
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

  const assigning = assignmentProgress != null;

  return (
    <div className="space-y-4">
      {canModify ? (
        <div className="flex w-full justify-center">
          <div
            className="flex w-full max-w-md gap-1 rounded-lg border border-border bg-card p-1 sm:inline-flex sm:w-auto sm:max-w-none"
            role="tablist"
            aria-label="Modo de impresoras"
          >
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === "inventory"}
              onClick={() => setViewMode("inventory")}
              className={filterTabToggleClass(
                viewMode === "inventory",
                printerModeButtonClass,
              )}
            >
              Inventario
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === "assignment"}
              onClick={() => setViewMode("assignment")}
              className={filterTabToggleClass(
                viewMode === "assignment",
                printerModeButtonClass,
              )}
            >
              Asignación
            </button>
          </div>
        </div>
      ) : null}

      <PageToolbar
        actions={
          viewMode === "inventory" && canCreate ? (
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
        {viewMode === "assignment" ? (
          loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-muted">
              <Loader2 className="size-5 animate-spin" />
              Cargando impresoras…
            </div>
          ) : (
            <div className="space-y-4 p-4 sm:p-5">
            <div className="rounded-lg border border-border/70 bg-foreground/[0.02] p-4">
              <h3 className="text-sm font-semibold text-card-foreground">
                Paso 1: Selecciona la distribuidora destino
              </h3>
              <p className="mt-1 text-sm text-muted">
                Solo se pueden asignar impresoras con estatus{" "}
                <strong>Inicializada</strong>. Al confirmar, pasarán a{" "}
                <strong>Asignada</strong>.
              </p>
              <label className="mt-3 block max-w-xl text-sm">
                <span className="mb-1 block text-muted">Distribuidora</span>
                <select
                  value={resolvedAssignmentDistributorId}
                  onChange={(e) => setAssignmentDistributorId(e.target.value)}
                  disabled={assigning || distributorOptions.length === 0}
                  className="w-full rounded-md border border-border bg-card px-3 py-2 text-card-foreground outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
                >
                  {distributorOptions.length === 0 ? (
                    <option value="">Sin distribuidoras disponibles</option>
                  ) : (
                    distributorOptions.map((option) => (
                      <option key={option.id} value={String(option.id)}>
                        {option.label}
                      </option>
                    ))
                  )}
                </select>
              </label>
            </div>

            <div className="rounded-lg border border-border/70 bg-foreground/[0.02] p-4">
              <h3 className="text-sm font-semibold text-card-foreground">
                Paso 2: Elige las impresoras fiscalizadas
              </h3>
              <p className="mt-1 text-sm text-muted">
                Elegibles: {assignablePrinters.length}. Seleccionadas:{" "}
                {selectedAssignablePrinters.length}.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <input
                  type="search"
                  value={assignmentSearch}
                  onChange={(e) => setAssignmentSearch(e.target.value)}
                  disabled={assigning}
                  placeholder="Buscar por serial o modelo..."
                  className="h-10 min-w-[240px] flex-1 rounded-md border border-border bg-card px-3 text-sm text-card-foreground outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
                />
                <label className="inline-flex items-center gap-2 text-sm text-card-foreground">
                  <input
                    type="checkbox"
                    checked={allVisibleAssignableSelected}
                    onChange={(e) => toggleAllVisibleAssignable(e.target.checked)}
                    disabled={assigning || filteredAssignablePrinters.length === 0}
                  />
                  Seleccionar visibles
                </label>
              </div>

              {assignablePrinters.length === 0 ? (
                <p className="mt-3 rounded-md border border-border/70 bg-card px-3 py-2 text-sm text-muted">
                  No hay impresoras con estatus Inicializada para asignar.
                </p>
              ) : filteredAssignablePrinters.length === 0 ? (
                <p className="mt-3 rounded-md border border-border/70 bg-card px-3 py-2 text-sm text-muted">
                  No hay resultados con ese filtro.
                </p>
              ) : (
                <TableScroll className="mt-3">
                  <table className="w-full min-w-[760px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-border bg-card text-muted">
                        <th className="w-10 px-3 py-2 font-medium">Sel</th>
                        <th className="px-3 py-2 font-medium">Serial</th>
                        <th className="px-3 py-2 font-medium">Modelo</th>
                        <th className="px-3 py-2 font-medium">Distribuidor actual</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAssignablePrinters.map((printer) => (
                        <tr key={printer.id} className="border-b border-border/60">
                          <td className="px-3 py-2">
                            <input
                              type="checkbox"
                              checked={selectedAssignmentIds.includes(printer.id)}
                              onChange={(e) =>
                                toggleAssignmentSelection(printer.id, e.target.checked)
                              }
                              disabled={assigning}
                              aria-label={`Seleccionar impresora ${printer.fiscalSerial}`}
                            />
                          </td>
                          <td className="px-3 py-2 font-mono text-card-foreground">
                            {printer.fiscalSerial}
                          </td>
                          <td className="px-3 py-2 text-card-foreground">
                            {getModelLabel(printer.modelId)}
                          </td>
                          <td className="px-3 py-2 text-muted">
                            {getDistributorLabel(printer.distributorId)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </TableScroll>
              )}
            </div>

            <div className="rounded-lg border border-border/70 bg-foreground/[0.02] p-4">
              <h3 className="text-sm font-semibold text-card-foreground">
                Paso 3: Confirmar asignación
              </h3>
              <p className="mt-1 text-sm text-muted">
                Se actualizará distribuidora y estatus a Asignada para las impresoras
                seleccionadas.
              </p>
              {assignmentProgress ? (
                <p className="mt-3 rounded-md border border-border/70 bg-card px-3 py-2 text-sm text-muted">
                  Procesando {assignmentProgress.done} de {assignmentProgress.total}
                  {assignmentProgress.currentSerial
                    ? ` · Serial: ${assignmentProgress.currentSerial}`
                    : ""}
                </p>
              ) : null}
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => void handleAssignPrinters()}
                  disabled={
                    assigning ||
                    selectedAssignablePrinters.length === 0 ||
                    !resolvedAssignmentDistributorId
                  }
                  className={cn(
                    pageToolbarButtonClass,
                    "bg-accent text-accent-foreground disabled:cursor-not-allowed disabled:opacity-60",
                  )}
                >
                  {assigning ? "Asignando..." : "Asignar seleccionadas"}
                </button>
              </div>
            </div>
            </div>
          )
        ) : loading ? (
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
