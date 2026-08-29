import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import {
  filterPrintersByQuickFilter,
  filterPrintersForBranch,
  getBranchPrinterStats,
  type BranchPrinterQuickFilter,
} from "@/lib/branch-printers";
import { PrinterStatusBadge } from "@/components/printers/printer-status-badge";
import { PrinterPendingMqttBadge } from "@/components/printers/printer-pending-mqtt-badge";
import { PrinterStatusTransition } from "@/components/printers/printer-status-transition";
import { PrinterCreateWizardDialog } from "@/components/printers/printer-create-wizard-dialog";
import { PrinterAssignmentDialog } from "@/components/printers/printer-assignment-dialog";
import { PrinterDispositionDialog } from "@/components/printers/printer-disposition-dialog";
import { PrinterDeleteBlockedDialog } from "@/components/printers/printer-delete-blocked-dialog";
import type { SelectOption } from "@/components/printers/printer-form-dialog";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import {
  TableQuickFilterButton,
  TableQuickFilters,
} from "@/components/ui/table-quick-filters";
import { EmptyState, TableFilterEmptyState } from "@/components/ui/empty-state";
import { TablePagination } from "@/components/ui/table-pagination";
import { TableScroll } from "@/components/ui/table-scroll";
import { ClickableTableRow } from "@/components/ui/clickable-table-row";
import { TableRowActionsMenu } from "@/components/ui/table-row-actions-menu";
import {
  TableRowMetaCells,
  TableRowMetaHeaders,
} from "@/components/ui/table-meta-column-slots";
import { SortableTableHeader } from "@/components/ui/sortable-table-header";
import { useAuth } from "@/context/auth-provider";
import { useCompanyScope } from "@/context/company-scope-provider";
import { useToast } from "@/context/toast-provider";
import { useConfirm } from "@/context/confirm-provider";
import { usePagination } from "@/hooks/use-pagination";
import { useTableColumnVisibility } from "@/hooks/use-table-column-visibility";
import { useDistributorStaffBranchId } from "@/hooks/use-distributor-staff-branch-id";
import { reportListTableError } from "@/lib/api-error-message";
import {
  canCreatePrinterRecord,
  canDisposePrinterRecord,
  canModifyPrinterRecord,
  CATALOG_MODIFY_FORBIDDEN_MESSAGE,
} from "@/lib/api-permissions";
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
import { fetchSoftware } from "@/lib/software-api";
import {
  DEVICE_TYPE_LABELS,
  emptyPrinterForm,
  isPrinterPaidForDisposition,
  printerModelLabel,
  printerToAssignmentRequest,
  printerToFormValues,
  PRINTER_STATUS_LABELS,
  PRINTER_UNPAID_DISPOSITION_MESSAGE,
  toPrinterEditRequest,
  toPrinterRequest,
  type PrinterFormValues,
} from "@/lib/printer-form";
import {
  buildPrinterRollbackConsequences,
  isBackwardPrinterStatusTransition,
  isPrinterUnassigned,
  normalizePrinterStatus,
  printerStatusLabel,
} from "@/lib/printer-status";
import { formatDate } from "@/lib/datetime-form";
import { filterAllOption } from "@/lib/table-filter-options";
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
  isPrinterDeleteBlockedError,
  updatePrinter,
} from "@/lib/printers-api";
import {
  getPrinterStatusBadgeTitle,
  getPrinterStatusQuickAction,
} from "@/lib/printer-quick-actions";
import { isPrinterPendingMqttEnajenacion } from "@/lib/printer-enajenacion-ticket";
import {
  DISTRIBUTOR_SELF_CLIENT_MESSAGE,
  excludeDistributorSelfClients,
  filterPrinterModelsForDistributor,
  isDistributorSelfClient,
} from "@/lib/distributor-scope";
import { printerDispositionPath, printerPath } from "@/lib/resource-routes";
import { PRINTER_STATUSES } from "@/types/printer";
import type { BranchResponse, BranchWithRoles } from "@/types/branch";
import type { ClientResponse, DistributorResponse } from "@/types/branch-role";
import type { CompanyResponse } from "@/types/company";
import type { PrinterModelResponse } from "@/types/printer-model";
import type { PrinterResponse, PrinterStatus } from "@/types/printer";
import type { PrinterDependencyRef } from "@/types/printer-dependencies";
import { isDistributorPanelRole } from "@/types/user";

type BranchPrinterSortKey =
  | "id"
  | "createdAt"
  | "fiscalSerial"
  | "model"
  | "status"
  | "installationDate";

type BranchPrintersTableProps = {
  branch: BranchWithRoles;
  client?: ClientResponse | null;
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

export function BranchPrintersTable({
  branch,
  client,
}: BranchPrintersTableProps) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const { user } = useAuth();
  const { scope } = useCompanyScope();

  const isAdmin = user?.role === "ADMIN";
  const isDistributor = isDistributorPanelRole(user?.role);
  const canCreate = user ? canCreatePrinterRecord(user.role) : false;
  const canModify = user ? canModifyPrinterRecord(user.role) : false;
  const canAssignInitialized = isAdmin && canModify;
  const canDispose = user ? canDisposePrinterRecord(user.role) : false;
  const distributorId = isDistributor ? (user?.distributorId ?? null) : null;
  const lockDistributor = isDistributor && distributorId != null;
  const canDisposeAssigned =
    canDispose && (isAdmin || (isDistributor && distributorId != null));
  const distributorStaffBranchId = useDistributorStaffBranchId(
    isDistributor ? distributorId : null,
  );

  const [allPrinters, setAllPrinters] = useState<PrinterResponse[]>([]);
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

  const [dialog, setDialog] = useState<"create" | "edit" | null>(null);
  const [selected, setSelected] = useState<PrinterResponse | null>(null);
  const [assignmentPrinter, setAssignmentPrinter] =
    useState<PrinterResponse | null>(null);
  const [assignmentSaving, setAssignmentSaving] = useState(false);
  const [assignmentError, setAssignmentError] = useState<string | null>(null);
  const [dispositionPrinter, setDispositionPrinter] =
    useState<PrinterResponse | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteBlocked, setDeleteBlocked] = useState<{
    printerId: number;
    printerLabel: string;
    message: string;
    dependencies: PrinterDependencyRef[];
    consequences: string[];
  } | null>(null);
  const [forceDeleting, setForceDeleting] = useState(false);

  const [search, setSearch] = useState("");
  const [quickFilter, setQuickFilter] =
    useState<BranchPrinterQuickFilter>("all");
  const [statusFilter, setStatusFilter] = useState<PrinterStatus | "all">("all");
  const [sort, setSort] = useState<TableSortState<BranchPrinterSortKey>>(null);

  const tableColumns = useTableColumnVisibility(`branch-printers-${branch.id}`);

  const loadData = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;
    if (!silent) {
      setLoading(true);
      setListError(null);
    }
    try {
      const data = await fetchPrinters();
      setAllPrinters(data);
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
    void loadData();
  }, [loadData]);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  const visibleModels = useMemo(() => {
    if (!isDistributor) return models;
    return filterPrinterModelsForDistributor(models, allPrinters);
  }, [models, isDistributor, allPrinters]);

  const modelsById = useMemo(
    () => new Map(models.map((m) => [m.id, m])),
    [models],
  );

  useEffect(() => {
    if (allPrinters.length === 0) return;
    if (missingPrinterModelIds(allPrinters, models).length === 0) return;

    let cancelled = false;
    void fetchMissingPrinterModels(allPrinters, models).then((next) => {
      if (
        !cancelled &&
        missingPrinterModelIds(allPrinters, next).length <
          missingPrinterModelIds(allPrinters, models).length
      ) {
        setModels(next);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [allPrinters, models]);

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

  const defaultClientId = useMemo(() => {
    if (client?.id != null) return String(client.id);
    if (branch.client?.id != null) return String(branch.client.id);
    const matched = clients.find((c) => c.branchId === branch.id);
    return matched ? String(matched.id) : "";
  }, [client, branch, clients]);

  const defaultDistributorId = useMemo(() => {
    if (lockDistributor && distributorId != null) return distributorId;
    if (branch.distributor?.id != null) return branch.distributor.id;
    if (client?.distributorId != null) return client.distributorId;
    if (branch.client?.distributorId != null) return branch.client.distributorId;
    return null;
  }, [lockDistributor, distributorId, branch, client]);

  const branchPrinters = useMemo(
    () => filterPrintersForBranch(allPrinters, branch, client, clients),
    [allPrinters, branch, client, clients],
  );

  const stats = useMemo(
    () => getBranchPrinterStats(branchPrinters),
    [branchPrinters],
  );

  const statusFilterOptions = useMemo(
    () => [
      filterAllOption("Todos los estatus"),
      ...PRINTER_STATUSES.map((status) => ({
        value: status,
        label: PRINTER_STATUS_LABELS[status],
      })),
    ],
    [],
  );

  const filteredPrinters = useMemo(() => {
    let list = filterPrintersByQuickFilter(branchPrinters, quickFilter);

    if (statusFilter !== "all") {
      list = list.filter(
        (p) => normalizePrinterStatus(p.status) === statusFilter,
      );
    }

    const q = search.trim().toLowerCase();
    if (!q) return list;

    return list.filter((printer) => {
      const model = modelsById.get(printer.modelId);
      const modelLabel = model ? printerModelLabel(model) : "";
      const statusLabel = printerStatusLabel(printer.status);
      const deviceTypeLabel =
        DEVICE_TYPE_LABELS[printer.deviceType] ?? printer.deviceType;

      const haystack = [
        printer.id,
        printer.fiscalSerial,
        modelLabel,
        statusLabel,
        deviceTypeLabel,
        printer.versionFirmware ?? "",
        printer.macAddress ?? "",
        printer.installationDate ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [branchPrinters, quickFilter, statusFilter, search, modelsById]);

  const sortedPrinters = useMemo(
    () =>
      sortTableRows(filteredPrinters, sort, {
        id: (a, b) => compareNumberValues(a.id, b.id),
        createdAt: (a, b) => compareDateValues(a.createdAt, b.createdAt),
        fiscalSerial: (a, b) =>
          a.fiscalSerial.localeCompare(b.fiscalSerial, "es"),
        model: (a, b) => {
          const mA = modelsById.get(a.modelId)?.modelCode ?? "";
          const mB = modelsById.get(b.modelId)?.modelCode ?? "";
          return mA.localeCompare(mB, "es");
        },
        status: (a, b) => a.status.localeCompare(b.status, "es"),
        installationDate: (a, b) =>
          compareDateValues(a.installationDate, b.installationDate),
      }),
    [filteredPrinters, sort, modelsById],
  );

  const pagination = usePagination(sortedPrinters);

  function getClientName(clientId: number | null): string {
    if (clientId == null) return "—";
    const c = clients.find((x) => x.id === clientId);
    if (!c) return "—";
    return clientLabel(c, branches, companies);
  }

  function getDistributorName(distId: number | null): string {
    if (distId == null) return "—";
    const d = distributors.find((x) => x.id === distId);
    if (!d) return "—";
    return distributorLabel(d, branches, companies);
  }

  function openCreate() {
    setSelected(null);
    setFormError(null);
    setDialog("create");
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
      isDistributorSelfClient(clientId, clients, distributorStaffBranchId)
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
      await loadData({ silent: true });
    } catch (err) {
      const message = getPrintersErrorMessage(err);
      setAssignmentError(message);
      toast.error(message);
    } finally {
      setAssignmentSaving(false);
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

    if (dialog === "edit" && selected) {
      const isBackward = isBackwardPrinterStatusTransition({
        currentStatus: selected.status,
        newStatus: bodyOrError.status,
        currentClientId: selected.clientId,
        newClientId: bodyOrError.clientId,
        currentDistributorId: selected.distributorId,
        newDistributorId: bodyOrError.distributorId,
      });

      if (isBackward) {
        const currentClientLabel =
          selected.clientId != null ? getClientName(selected.clientId) : null;
        const currentDistributorLabel =
          selected.distributorId != null
            ? getDistributorName(selected.distributorId)
            : null;

        const consequences = buildPrinterRollbackConsequences({
          currentStatus: selected.status,
          newStatus: bodyOrError.status,
          currentClientId: selected.clientId,
          newClientId: bodyOrError.clientId,
          currentDistributorId: selected.distributorId,
          newDistributorId: bodyOrError.distributorId,
          clientLabel: currentClientLabel,
          distributorLabel: currentDistributorLabel,
        });

        const confirmed = await confirm({
          title: "Confirmar cambio de estatus",
          content: (
            <div className="space-y-3">
              <p className="text-sm text-muted">
                Vas a cambiar el estatus de la impresora{" "}
                <strong className="font-mono text-card-foreground">
                  {selected.fiscalSerial}
                </strong>{" "}
                hacia un estado anterior.
              </p>
              <PrinterStatusTransition
                from={normalizePrinterStatus(selected.status)}
                to={normalizePrinterStatus(bodyOrError.status)}
              />
              {consequences.length > 0 ? (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-destructive">
                    Consecuencias de esta acción:
                  </p>
                  <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-card-foreground">
                    {consequences.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ),
          confirmLabel: "Confirmar cambio",
          destructive: true,
        });

        if (!confirmed) return;
      }
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
      await loadData();
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
    if (
      !(await confirm({
        title: "Confirmar",
        message: `¿Eliminar la impresora con serial ${printer.fiscalSerial}?`,
        destructive: true,
      }))
    ) {
      return;
    }
    setDeletingId(printer.id);
    try {
      await deletePrinter(printer.id);
      if (fromDialog) closeDialog();
      toast.success("Impresora eliminada.");
      await loadData({ silent: true });
    } catch (err) {
      if (isPrinterDeleteBlockedError(err)) {
        setDeleteBlocked({
          printerId: printer.id,
          printerLabel: printer.fiscalSerial,
          message: err.message,
          dependencies: err.dependencies,
          consequences: err.consequences,
        });
      } else {
        reportListTableError({
          message: getPrintersErrorMessage(err),
          recordLabel: printer.fiscalSerial,
          setListError,
          toast,
        });
      }
    } finally {
      setDeletingId(null);
    }
  }

  async function handleForceDelete() {
    if (!deleteBlocked) return;
    const { printerId, printerLabel } = deleteBlocked;
    setForceDeleting(true);
    try {
      await deletePrinter(printerId, { force: true });
      setDeleteBlocked(null);
      toast.success(`Impresora ${printerLabel} eliminada (borrado forzado).`);
      await loadData({ silent: true });
    } catch (err) {
      const message = getPrintersErrorMessage(err);
      toast.error(message);
    } finally {
      setForceDeleting(false);
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-card-foreground">
            Impresoras asociadas
          </h3>
          <p className="text-xs text-muted">
            Equipos fiscales registrados para esta empresa
          </p>
        </div>
        {canCreate && (
          <button
            type="button"
            onClick={openCreate}
            disabled={catalogLoading || modelsLoading}
            className="inline-flex w-full shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90 disabled:opacity-50 sm:w-auto"
          >
            <Plus className="size-4" />
            Nueva impresora
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
            Cargando impresoras…
          </div>
        ) : branchPrinters.length === 0 ? (
          <EmptyState
            title="Esta empresa no tiene impresoras asociadas."
            description="Las impresoras vinculadas al cliente o gestionadas por la distribuidora aparecerán aquí."
            action={
              canCreate ? (
                <button
                  type="button"
                  onClick={openCreate}
                  disabled={catalogLoading || modelsLoading}
                  className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90 disabled:opacity-50"
                >
                  <Plus className="size-4" />
                  Crear impresora
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
                active={quickFilter === "asignada"}
                onClick={() => setQuickFilter("asignada")}
              >
                Asignadas ({stats.assigned})
              </TableQuickFilterButton>
              <TableQuickFilterButton
                active={quickFilter === "enajenada"}
                onClick={() => setQuickFilter("enajenada")}
              >
                Enajenadas ({stats.disposed})
              </TableQuickFilterButton>
              {stats.other > 0 && (
                <TableQuickFilterButton
                  active={quickFilter === "other"}
                  onClick={() => setQuickFilter("other")}
                >
                  Otras ({stats.other})
                </TableQuickFilterButton>
              )}
            </TableQuickFilters>

            <DataTableToolbar
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder="Buscar por serial, modelo, estatus…"
              resultCount={filteredPrinters.length}
              totalCount={branchPrinters.length}
              filters={[
                {
                  id: "status",
                  label: "Estatus",
                  value: statusFilter,
                  onChange: (v) => setStatusFilter(v as PrinterStatus | "all"),
                  options: statusFilterOptions,
                },
              ]}
              columns={tableColumns.toolbarColumns}
            />

            {filteredPrinters.length === 0 ? (
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
                            <th className="px-5 py-3 font-medium text-right">
                              Acciones
                            </th>
                          }
                        >
                          <SortableTableHeader
                            label="Serial fiscal"
                            sortDirection={
                              sort?.key === "fiscalSerial"
                                ? sort.direction
                                : null
                            }
                            onToggle={() =>
                              setSort((current) =>
                                toggleTableSort(current, "fiscalSerial"),
                              )
                            }
                          />
                          <SortableTableHeader
                            label="Modelo"
                            sortDirection={
                              sort?.key === "model" ? sort.direction : null
                            }
                            onToggle={() =>
                              setSort((current) =>
                                toggleTableSort(current, "model"),
                              )
                            }
                          />
                          <SortableTableHeader
                            label="Estatus"
                            sortDirection={
                              sort?.key === "status" ? sort.direction : null
                            }
                            onToggle={() =>
                              setSort((current) =>
                                toggleTableSort(current, "status"),
                              )
                            }
                          />
                          <th className="px-5 py-3 font-medium">Dispositivo</th>
                          <SortableTableHeader
                            label="Fecha de instalación"
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
                          <th className="px-5 py-3 font-medium">Pagada</th>
                        </TableRowMetaHeaders>
                      </tr>
                    </thead>
                    <tbody>
                      {pagination.paginatedItems.map((printer) => {
                        const model = modelsById.get(printer.modelId);
                        const modelName = model
                          ? printerModelLabel(model)
                          : `Modelo #${printer.modelId}`;

                        const statusQuickAction = getPrinterStatusQuickAction({
                          status: printer.status,
                          printer,
                          canAssign: canAssignInitialized,
                          canDispose: canDisposeAssigned,
                          onAssign: () => openAssignment(printer),
                          onDispose: () => openDisposition(printer),
                        });
                        const statusBadgeTitle = getPrinterStatusBadgeTitle({
                          status: printer.status,
                          printer,
                          canDispose: canDisposeAssigned,
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
                                <td
                                  className="px-5 py-3.5"
                                  data-row-click="ignore"
                                >
                                  <TableRowActionsMenu
                                    viewHref={printerPath(printer.id)}
                                    viewLabel={`Ver impresora ${printer.fiscalSerial}`}
                                    onEdit={
                                      canModify
                                        ? () => openEdit(printer)
                                        : undefined
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
                              <td className="px-5 py-3.5 text-card-foreground">
                                {modelName}
                              </td>
                              <td
                                className="px-5 py-3.5"
                                data-row-click="ignore"
                              >
                                <div className="flex flex-wrap items-center gap-2">
                                  <PrinterStatusBadge
                                    status={printer.status}
                                    onClick={statusQuickAction?.onClick}
                                    actionLabel={statusQuickAction?.label}
                                    title={statusBadgeTitle}
                                  />
                                  {isPrinterPendingMqttEnajenacion(printer) ? (
                                    <PrinterPendingMqttBadge />
                                  ) : null}
                                </div>
                              </td>
                              <td className="px-5 py-3.5 text-muted">
                                {DEVICE_TYPE_LABELS[printer.deviceType] ??
                                  printer.deviceType}
                              </td>
                              <td className="px-5 py-3.5 text-muted">
                                {printer.installationDate
                                  ? formatDate(printer.installationDate)
                                  : "—"}
                              </td>
                              <td className="px-5 py-3.5 text-muted">
                                {printer.paid ? (
                                  <span className="inline-flex rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:text-emerald-200">
                                    Sí
                                  </span>
                                ) : (
                                  <span className="inline-flex rounded-full bg-slate-500/10 px-2 py-0.5 text-xs font-medium text-slate-700 dark:text-slate-300">
                                    No
                                  </span>
                                )}
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
          reconfigure={isPrinterPendingMqttEnajenacion(dispositionPrinter)}
          onClose={closeDisposition}
          onContinue={handleDispositionContinue}
        />
      ) : null}

      <PrinterCreateWizardDialog
        open={dialog === "create"}
        saving={saving}
        error={formError}
        initialValues={emptyPrinterForm({
          clientId: defaultClientId,
          distributorId:
            defaultDistributorId != null ? String(defaultDistributorId) : "",
        })}
        modelOptions={modelOptions}
        softwareOptions={software}
        clientOptions={clientOptions}
        distributorOptions={distributorOptions}
        modelsLoading={modelsLoading}
        catalogLoading={catalogLoading}
        canPickSoftware={user?.role === "ADMIN"}
        lockDistributor={lockDistributor}
        defaultDistributorId={defaultDistributorId}
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

      <PrinterDeleteBlockedDialog
        open={deleteBlocked != null}
        printerLabel={deleteBlocked?.printerLabel ?? ""}
        message={
          deleteBlocked?.message ?? "Esta impresora tiene registros vinculados."
        }
        dependencies={deleteBlocked?.dependencies ?? []}
        consequences={deleteBlocked?.consequences ?? []}
        forcing={forceDeleting}
        onClose={() => {
          if (!forceDeleting) setDeleteBlocked(null);
        }}
        onForceDelete={handleForceDelete}
      />
    </section>
  );
}

