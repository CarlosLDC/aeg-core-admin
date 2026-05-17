"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import {
  PrinterFormDialog,
  type SelectOption,
} from "@/components/printers/printer-form-dialog";
import { PrinterStatusBadge } from "@/components/printers/printer-status-badge";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { TablePagination } from "@/components/ui/table-pagination";
import { useAuth } from "@/context/auth-provider";
import { useCompanyScope } from "@/context/company-scope-provider";
import {
  canCreatePrinterRecord,
  canModifyPrinterRecord,
  CATALOG_MODIFY_FORBIDDEN_MESSAGE,
} from "@/lib/api-permissions";
import { useToast } from "@/context/toast-provider";
import { usePagination } from "@/hooks/use-pagination";
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
import { fetchSoftware } from "@/lib/software-api";
import type { BranchResponse } from "@/types/branch";
import type { ClientResponse, DistributorResponse } from "@/types/branch-role";
import type { CompanyResponse } from "@/types/company";
import type { PrinterModelResponse } from "@/types/printer-model";
import type { PrinterResponse, PrinterStatus } from "@/types/printer";
import { PRINTER_STATUSES } from "@/types/printer";
import { cn } from "@/lib/utils";
import { TableScroll } from "@/components/ui/table-scroll";

function clientLabel(
  client: ClientResponse,
  branches: BranchResponse[],
  companies: CompanyResponse[],
): string {
  const branch = branches.find((b) => b.id === client.branchId);
  if (!branch) return `Cliente #${client.id}`;
  return formatBranchShort(branch, companies);
}

export function PrintersManager() {
  const toast = useToast();
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

  const [dialog, setDialog] = useState<"create" | "edit" | null>(null);
  const [selected, setSelected] = useState<PrinterResponse | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<PrinterStatus | "all">(
    "all",
  );

  const modelById = useMemo(
    () => new Map(models.map((m) => [m.id, m])),
    [models],
  );

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
        printer.distributorId,
        printer.clientId,
        printer.macAddress,
        printer.versionFirmware,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [visiblePrinters, search, statusFilter, modelById]);

  const pagination = usePagination(filteredPrinters);

  const modelOptions = useMemo<SelectOption[]>(
    () =>
      [...models]
        .sort((a, b) =>
          printerModelLabel(a).localeCompare(printerModelLabel(b), "es"),
        )
        .map((m) => ({ id: m.id, label: `#${m.id} · ${printerModelLabel(m)}` })),
    [models],
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
        label: `#${d.id} · ${distributorLabel(d, branches, companies)}`,
      }))
      .sort((a, b) => a.label.localeCompare(b.label, "es"));
  }, [distributors, branches, companies, lockDistributor, distributorId]);

  const clientOptions = useMemo<SelectOption[]>(
    () =>
      scopedClients
        .map((c) => ({
          id: c.id,
          label: `#${c.id} · ${clientLabel(c, branches, companies)}`,
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
    return model ? printerModelLabel(model) : `Modelo #${modelId}`;
  }

  function getDistributorLabel(distributorId: number | null): string {
    if (distributorId == null) return "—";
    const d = distributors.find((x) => x.id === distributorId);
    if (!d) return `#${distributorId}`;
    return distributorLabel(d, branches, companies);
  }

  function getClientLabel(clientId: number | null): string {
    if (clientId == null) return "—";
    const c = clients.find((x) => x.id === clientId);
    if (!c) return `#${clientId}`;
    return clientLabel(c, branches, companies);
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
        await createPrinter(bodyOrError);
        toast.success(`Impresora ${bodyOrError.fiscalSerial} creada.`);
      } else if (selected) {
        await updatePrinter(selected.id, bodyOrError);
        toast.success("Impresora actualizada.");
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

  async function handleDelete(printer: PrinterResponse) {
    if (!canModify) {
      toast.error(CATALOG_MODIFY_FORBIDDEN_MESSAGE);
      return;
    }
    if (
      !window.confirm(
        `¿Eliminar la impresora con serial ${printer.fiscalSerial}?`,
      )
    ) {
      return;
    }
    setDeletingId(printer.id);
    try {
      await deletePrinter(printer.id);
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
      <div className="flex flex-col gap-3 md:flex-row md:flex-nowrap md:items-center md:justify-between md:gap-4">
        <p className="min-w-0 flex-1 text-sm text-muted">
          {isDistributor
            ? "Impresoras asignadas a tu distribuidora."
            : "Inventario de impresoras fiscales. Acceso para administradores, distribuidores y técnicos."}
        </p>
        <div className="flex w-full shrink-0 flex-col gap-2 max-md:w-full md:w-auto md:flex-row md:flex-nowrap">
          <button
            type="button"
            onClick={() => {
              loadPrinters();
              loadCatalog();
            }}
            disabled={loading}
            className="inline-flex w-full shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-border bg-card md:w-auto px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-foreground/5 disabled:opacity-50"
          >
            <RefreshCw className={cn("size-4", loading && "animate-spin")} />
            Actualizar
          </button>
          {canCreate && (
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex w-full shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-accent px-3 py-2 md:w-auto text-sm font-medium text-accent-foreground"
            >
              <Plus className="size-4" />
              Nueva impresora
            </button>
          )}
        </div>
      </div>

      {isDistributor && distributorId == null && !loading && (
        <p
          role="alert"
          className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200"
        >
          Tu usuario no tiene una distribuidora vinculada. Contacta a un
          administrador para que te asigne una en tu cuenta.
        </p>
      )}

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
          <p className="py-16 text-center text-sm text-muted">
            {isDistributor
              ? "No hay impresoras asignadas a tu distribuidora."
              : "No hay impresoras registradas."}
          </p>
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
                    { value: "all", label: "Todos" },
                    ...PRINTER_STATUSES.map((status) => ({
                      value: status,
                      label: PRINTER_STATUS_LABELS[status],
                    })),
                  ],
                },
              ]}
            />
            {filteredPrinters.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted">
                No hay resultados con los filtros aplicados.
              </p>
            ) : (
              <>
                <TableScroll>
                  <table className="w-full min-w-[1100px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-border bg-foreground/[0.02] text-muted">
                        <th className="px-5 py-3 font-medium">Serial</th>
                        <th className="px-5 py-3 font-medium">Modelo</th>
                        <th className="px-5 py-3 font-medium">Estatus</th>
                        <th className="px-5 py-3 font-medium">Tipo</th>
                        <th className="px-5 py-3 font-medium">Distribuidor</th>
                        <th className="px-5 py-3 font-medium">Cliente</th>
                        <th className="px-5 py-3 font-medium">Precio</th>
                        <th className="px-5 py-3 font-medium">Pagada</th>
                        <th className="px-5 py-3 font-medium">Instalación</th>
                        <th className="px-5 py-3 font-medium text-right">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagination.paginatedItems.map((printer) => (
                        <tr
                          key={printer.id}
                          className="border-b border-border last:border-0 hover:bg-foreground/[0.02]"
                        >
                          <td className="px-5 py-3.5 font-mono font-medium text-card-foreground">
                            {printer.fiscalSerial}
                          </td>
                          <td className="px-5 py-3.5 text-card-foreground">
                            {getModelLabel(printer.modelId)}
                          </td>
                          <td className="px-5 py-3.5">
                            <PrinterStatusBadge status={printer.status} />
                          </td>
                          <td className="px-5 py-3.5 text-muted">
                            {DEVICE_TYPE_LABELS[printer.deviceType] ??
                              printer.deviceType}
                          </td>
                          <td className="max-w-[160px] truncate px-5 py-3.5 text-muted">
                            {getDistributorLabel(printer.distributorId)}
                          </td>
                          <td className="max-w-[160px] truncate px-5 py-3.5 text-muted">
                            {getClientLabel(printer.clientId)}
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
                          <td className="px-5 py-3.5">
                            {canModify ? (
                              <div className="flex justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => openEdit(printer)}
                                  className="rounded-lg p-2 text-muted transition-colors hover:bg-foreground/5 hover:text-foreground"
                                  aria-label={`Editar ${printer.fiscalSerial}`}
                                >
                                  <Pencil className="size-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDelete(printer)}
                                  disabled={deletingId === printer.id}
                                  className="rounded-lg p-2 text-muted transition-colors hover:bg-rose-500/10 hover:text-rose-600 disabled:opacity-50"
                                  aria-label={`Eliminar ${printer.fiscalSerial}`}
                                >
                                  {deletingId === printer.id ? (
                                    <Loader2 className="size-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="size-4" />
                                  )}
                                </button>
                              </div>
                            ) : (
                              <span className="text-muted">—</span>
                            )}
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

      <PrinterFormDialog
        mode={dialog === "create" ? "create" : "edit"}
        printer={selected ?? undefined}
        open={dialog !== null}
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
    </div>
  );
}
