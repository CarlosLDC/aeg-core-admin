"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, RefreshCw, ShieldCheck } from "lucide-react";
import { PrinterAssignmentDialog } from "@/components/printers/printer-assignment-dialog";
import { PrinterCreateWizardDialog } from "@/components/printers/printer-create-wizard-dialog";
import { PrinterDispositionDialog } from "@/components/printers/printer-disposition-dialog";
import { PrinterDeleteBlockedDialog } from "@/components/printers/printer-delete-blocked-dialog";
import { PrinterSealsDialog } from "@/components/printers/printer-seals-dialog";
import { PrinterSealsSection } from "@/components/printers/printer-seals-section";
import type { SelectOption } from "@/components/printers/printer-form-dialog";
import {
  DetailCard,
  DetailField,
  DetailSection,
} from "@/components/resource-view/detail-fields";
import {
  hrefForClient,
  hrefForDistributor,
  hrefForPrinterModel,
} from "@/lib/table-foreign-hrefs";
import { DetailSectionsPager } from "@/components/resource-view/detail-sections-pager";
import { PrinterStatusBadge } from "@/components/printers/printer-status-badge";
import { PrinterStatusTransition } from "@/components/printers/printer-status-transition";
import { PrinterPendingMqttBadge } from "@/components/printers/printer-pending-mqtt-badge";
import { PrinterTicketConfigPanel } from "@/components/printers/printer-ticket-json-preview";
import { ResourceViewActions } from "@/components/resource-view/resource-view-actions";
import { ResourceViewShell } from "@/components/resource-view/resource-view-shell";
import { useAuth } from "@/context/auth-provider";
import { useCompanyScope } from "@/context/company-scope-provider";
import { useToast } from "@/context/toast-provider";
import { useConfirm } from "@/context/confirm-provider";
import { useResourceId } from "@/hooks/use-resource-id";
import {
  canCreateSealRecord,
  canDisposePrinterRecord,
  canDeletePrinterRecord,
  canModifyPrinterRecord,
  canModifySealRecord,
  CATALOG_MODIFY_FORBIDDEN_MESSAGE,
} from "@/lib/api-permissions";
import {
  DISTRIBUTOR_SELF_CLIENT_MESSAGE,
  excludeDistributorSelfClients,
  isDistributorSelfClient,
} from "@/lib/distributor-scope";
import {
  buildPrinterRollbackConsequences,
  isBackwardPrinterStatusTransition,
  isPrinterUnassigned,
  normalizePrinterStatus,
} from "@/lib/printer-status";
import {
  isPrinterPendingMqttEnajenacion,
  PRINTER_TICKET_RECONFIGURE_LABEL,
} from "@/lib/printer-enajenacion-ticket";
import { getPrinterStatusQuickAction, getPrinterStatusBadgeTitle } from "@/lib/printer-quick-actions";
import { assertPrinterInScope } from "@/lib/permissions/scope-access";
import { useDistributorStaffBranchId } from "@/hooks/use-distributor-staff-branch-id";
import { distributorLabel } from "@/lib/branch-roles";
import { formatBranchShort } from "@/lib/branches";
import { fetchBranches } from "@/lib/branches-api";
import { fetchClients } from "@/lib/clients-api";
import { fetchCompanies } from "@/lib/companies-api";
import { fetchDistributors } from "@/lib/distributors-api";
import { formatDate } from "@/lib/datetime-form";
import {
  DEVICE_TYPE_LABELS,
  printerModelLabel,
  printerPaidLabel,
  printerToAssignmentRequest,
  printerToFormValues,
  PRINTER_UNPAID_DISPOSITION_MESSAGE,
  isPrinterPaidForDisposition,
  toPrinterEditRequest,
  type PrinterFormValues,
} from "@/lib/printer-form";
import { fetchPrinterModels } from "@/lib/printer-models-api";
import {
  fetchMissingPrinterModels,
  missingPrinterModelIds,
} from "@/lib/printer-models-catalog";
import {
  deletePrinter,
  fetchPrinterById,
  getPrintersErrorMessage,
  isPrinterDeleteBlockedError,
  updatePrinter,
} from "@/lib/printers-api";
import type { PrinterDependencyRef } from "@/types/printer-dependencies";
import { fetchAuthMe } from "@/lib/auth-me-api";
import { fetchSoftware } from "@/lib/software-api";
import { fetchSeals } from "@/lib/seals-api";
import {
  canAccessFiscalBooksApp,
  fiscalBooksAppUrl,
  fiscalBookLinkProps,
} from "@/lib/fiscal-books-app";
import { printerDispositionPath, printerPath } from "@/lib/resource-routes";
import type { BranchResponse } from "@/types/branch";
import type { ClientResponse, DistributorResponse } from "@/types/branch-role";
import type { CompanyResponse } from "@/types/company";
import type { PrinterResponse } from "@/types/printer";
import type { PrinterModelResponse } from "@/types/printer-model";
import type { SealResponse } from "@/types/seal";
import { isDistributorPanelRole } from "@/types/user";

function clientLabel(
  client: ClientResponse,
  branches: BranchResponse[],
  companies: CompanyResponse[],
): string {
  const branch = branches.find((b) => b.id === client.branchId);
  if (!branch) return "Cliente desconocido";
  return formatBranchShort(branch, companies);
}

export function PrinterView() {
  const id = useResourceId();
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const { user } = useAuth();
  const { scope } = useCompanyScope();
  const canModify = user ? canModifyPrinterRecord(user.role) : false;
  const canDelete = user ? canDeletePrinterRecord(user.role) : false;
  const isAdmin = user?.role === "ADMIN";
  const isDistributor = isDistributorPanelRole(user?.role);
  const showSoftware = isAdmin;
  const canAssignInitialized = isAdmin && canModify;
  const canDispose = user ? canDisposePrinterRecord(user.role) : false;
  const canManageSeals = user
    ? canCreateSealRecord(user.role) ||
      canModifySealRecord(user.role) ||
      canModify
    : false;
  const canOpenFiscalBook = user
    ? canAccessFiscalBooksApp(user.role)
    : false;

  const [printer, setPrinter] = useState<PrinterResponse | null>(null);
  const [seals, setSeals] = useState<SealResponse[]>([]);
  const [sealsLoading, setSealsLoading] = useState(true);
  const [sealsDialogOpen, setSealsDialogOpen] = useState(false);
  const [models, setModels] = useState<PrinterModelResponse[]>([]);
  const [software, setSoftware] = useState<SelectOption[]>([]);
  const [branches, setBranches] = useState<BranchResponse[]>([]);
  const [companies, setCompanies] = useState<CompanyResponse[]>([]);
  const [distributors, setDistributors] = useState<DistributorResponse[]>([]);
  const [clients, setClients] = useState<ClientResponse[]>([]);
  const [distributorId, setDistributorId] = useState<number | null>(
    user?.distributorId ?? null,
  );
  const [modelsLoading, setModelsLoading] = useState(true);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [assignmentOpen, setAssignmentOpen] = useState(false);
  const [assignmentSaving, setAssignmentSaving] = useState(false);
  const [assignmentError, setAssignmentError] = useState<string | null>(null);
  const [dispositionOpen, setDispositionOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteBlocked, setDeleteBlocked] = useState<{
    printerId: number;
    printerLabel: string;
    message: string;
    dependencies: PrinterDependencyRef[];
    consequences: string[];
  } | null>(null);
  const [forceDeleting, setForceDeleting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const lockDistributor = isDistributor && distributorId != null;
  const canDisposeAssigned =
    canDispose && (isAdmin || (isDistributor && distributorId != null));
  const showTicketReconfigure =
    printer != null &&
    isPrinterPendingMqttEnajenacion(printer) &&
    canDisposeAssigned;
  const distributorStaffBranchId = useDistributorStaffBranchId(
    isDistributor ? distributorId : null,
  );

  const loadSeals = useCallback(async () => {
    setSealsLoading(true);
    try {
      const data = await fetchSeals();
      setSeals(data);
    } catch {
      setSeals([]);
    } finally {
      setSealsLoading(false);
    }
  }, []);

  const load = useCallback(async () => {
    if (id == null) {
      setError("Identificador de impresora no válido.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await fetchPrinterById(id);
      if (
        user &&
        !assertPrinterInScope(scope, data, user.role, distributorId)
      ) {
        setError("No tienes acceso a este recurso.");
        setPrinter(null);
        return;
      }
      setPrinter(data);
    } catch (err) {
      setError(getPrintersErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [id, scope, user, distributorId]);

  useEffect(() => {
    void load();
    void loadSeals();
  }, [load, loadSeals]);

  useEffect(() => {
    if (!isDistributor) return;
    if (user?.distributorId != null) {
      setDistributorId(user.distributorId);
      return;
    }
    let cancelled = false;
    fetchAuthMe()
      .then((me) => {
        if (!cancelled) setDistributorId(me.distributorId ?? null);
      })
      .catch(() => {
        if (!cancelled) setDistributorId(null);
      });
    return () => {
      cancelled = true;
    };
  }, [isDistributor, user?.distributorId]);

  useEffect(() => {
    let cancelled = false;
    setModelsLoading(true);
    setCatalogLoading(true);
    Promise.all([
      fetchPrinterModels().catch(() => [] as PrinterModelResponse[]),
      showSoftware
        ? fetchSoftware()
        : Promise.resolve([] as Awaited<ReturnType<typeof fetchSoftware>>),
      scope ? Promise.resolve(scope.companies) : fetchCompanies(),
      scope ? Promise.resolve(scope.branches) : fetchBranches(),
      isDistributor
        ? Promise.resolve([] as DistributorResponse[])
        : fetchDistributors(),
      fetchClients(),
    ])
      .then(([modelRows, softwareRows, companyRows, branchRows, distributorRows, clientRows]) => {
        if (cancelled) return;
        setModels(modelRows);
        setSoftware(
          softwareRows.map((s) => ({
            id: s.id,
            label: s.name,
          })),
        );
        setCompanies(companyRows);
        setBranches(branchRows);
        setDistributors(distributorRows);
        setClients(clientRows);
      })
      .finally(() => {
        if (!cancelled) {
          setModelsLoading(false);
          setCatalogLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [scope, isDistributor, showSoftware]);

  useEffect(() => {
    if (!printer) return;
    if (missingPrinterModelIds([printer], models).length === 0) return;

    let cancelled = false;
    void fetchMissingPrinterModels([printer], models).then((next) => {
      if (
        !cancelled &&
        missingPrinterModelIds([printer], next).length <
          missingPrinterModelIds([printer], models).length
      ) {
        setModels(next);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [printer, models]);

  const modelOptions = useMemo<SelectOption[]>(
    () =>
      [...models]
        .sort((a, b) =>
          printerModelLabel(a).localeCompare(printerModelLabel(b), "es"),
        )
        .map((m) => ({ id: m.id, label: printerModelLabel(m) })),
    [models],
  );

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

  const scopedClients = useMemo(() => {
    if (lockDistributor && distributorId != null) {
      return excludeDistributorSelfClients(
        clients.filter((c) => c.distributorId === distributorId),
        distributorStaffBranchId,
      );
    }
    return clients;
  }, [
    clients,
    lockDistributor,
    distributorId,
    distributorStaffBranchId,
  ]);

  const clientOptions = useMemo<SelectOption[]>(() => {
    return scopedClients
      .map((c) => ({
        id: c.id,
        label: clientLabel(c, branches, companies),
      }))
      .sort((a, b) => a.label.localeCompare(b.label, "es"));
  }, [scopedClients, branches, companies]);

  const model = printer
    ? models.find((m) => m.id === printer.modelId)
    : undefined;
  const modelLabel = model
    ? printerModelLabel(model)
    : printer
      ? "Modelo desconocido"
      : "";

  const clientLabelById = useMemo(
    () => new Map(clientOptions.map((opt) => [opt.id, opt.label])),
    [clientOptions],
  );
  const softwareLabelById = useMemo(
    () => new Map(software.map((opt) => [opt.id, opt.label])),
    [software],
  );

  const statusQuickAction = printer
    ? getPrinterStatusQuickAction({
        status: printer.status,
        printer,
        canAssign: canAssignInitialized,
        canDispose: canDisposeAssigned,
        onAssign: () => {
          setAssignmentError(null);
          setAssignmentOpen(true);
        },
        onDispose: () => {
          if (!isPrinterPaidForDisposition(printer)) {
            toast.error(PRINTER_UNPAID_DISPOSITION_MESSAGE);
            return;
          }
          setDispositionOpen(true);
        },
      })
    : null;
  const statusBadgeTitle = printer
    ? getPrinterStatusBadgeTitle({
        status: printer.status,
        printer,
        canDispose: canDisposeAssigned,
      })
    : undefined;

  const distributorDetailContent = useMemo(() => {
    if (!printer) return null;

    return (
      <div className="space-y-6">
        <DetailCard>
          <DetailField
            label="Tipo de equipo"
            value={DEVICE_TYPE_LABELS[printer.deviceType]}
          />
          <DetailField
            label="Estatus"
            value={
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
            }
          />
          <DetailField
            label="Estado de pago"
            value={printerPaidLabel(printer.paid)}
          />
          <DetailField
            label="Fecha de enajenación"
            value={formatDate(printer.installationDate)}
          />
          <DetailField
            label="Cliente"
            value={
              printer.clientId != null
                ? clientLabelById.get(printer.clientId) ?? "—"
                : "Sin asignar"
            }
            href={
              user
                ? hrefForClient(printer.clientId, clients, user.role)
                : undefined
            }
          />
          <DetailField
            label="Firmware"
            value={printer.versionFirmware || "—"}
            mono
          />
          <DetailField label="MAC" value={printer.macAddress || "—"} mono />
          <DetailField
            label="Llave de encriptación"
            value={printer.encryptionKey || printer.llaveEncrip || "—"}
            mono
          />
        </DetailCard>
        <PrinterSealsSection
          printer={printer}
          seals={seals}
          loading={sealsLoading}
          canManage={canManageSeals}
          userRole={user?.role}
          onOpenManage={() => setSealsDialogOpen(true)}
        />
      </div>
    );
  }, [
    printer,
    user,
    clients,
    clientLabelById,
    statusQuickAction,
    statusBadgeTitle,
    seals,
    sealsLoading,
    canManageSeals,
  ]);

  const adminDetailSteps = useMemo(() => {
    if (!printer) return [];

    return [
      {
        id: "equipment",
        label: "Equipo",
        content: (
          <DetailSection title="Equipo fiscal" layout="quad">
            <DetailField
              label="Serial fiscal"
              value={printer.fiscalSerial}
              mono
            />
            <DetailField
              label="Modelo"
              value={modelLabel}
              href={
                user && model
                  ? hrefForPrinterModel(model.id, user.role)
                  : undefined
              }
            />
            <DetailField
              label="Tipo de equipo"
              value={DEVICE_TYPE_LABELS[printer.deviceType]}
            />
          </DetailSection>
        ),
      },
      {
        id: "operation",
        label: "Estado",
        content: (
          <DetailSection title="Estado operativo" layout="quad">
            <DetailField
              label="Estatus"
              value={
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
              }
            />
            <DetailField
              label="Estado de pago"
              value={printerPaidLabel(printer.paid)}
            />
            <DetailField
              label="Fecha de enajenación"
              value={formatDate(printer.installationDate)}
            />
          </DetailSection>
        ),
      },
      {
        id: "seals",
        label: "Precintos",
        content: (
          <PrinterSealsSection
            printer={printer}
            seals={seals}
            loading={sealsLoading}
            canManage={canManageSeals}
            userRole={user?.role}
            onOpenManage={() => setSealsDialogOpen(true)}
          />
        ),
      },
      {
        id: "ticket-remoto",
        label: "Ticket Remoto",
        content: (
          <DetailSection title="Campos JSON del ticket">
            <PrinterTicketConfigPanel
              header={printer.header}
              trailer={printer.trailer}
            />
            {!printer.header?.lines?.length && !printer.trailer?.lines?.length ? (
              <p className="text-sm text-muted">
                Aún no hay configuración de ticket guardada para esta impresora.
              </p>
            ) : null}
          </DetailSection>
        ),
      },
      {
        id: "assignment",
        label: isDistributor ? "Cliente" : "Asignación",
        content: (
          <DetailSection
            title={isDistributor ? "Cliente" : "Asignación"}
            layout="quad"
          >
            {!isDistributor ? (
              <DetailField
                label="Distribuidor"
                value={
                  printer.distributorId != null
                    ? distributorOptions.find(
                        (opt) => opt.id === printer.distributorId,
                      )?.label ?? "—"
                    : "Sin asignar"
                }
                href={
                  user
                    ? hrefForDistributor(
                        printer.distributorId,
                        distributors,
                        user.role,
                      )
                    : undefined
                }
              />
            ) : null}
            <DetailField
              label="Cliente"
              value={
                printer.clientId != null
                  ? clientLabelById.get(printer.clientId) ??
                    "—"
                  : "Sin asignar"
              }
              href={
                user
                  ? hrefForClient(printer.clientId, clients, user.role)
                  : undefined
              }
            />
            {showSoftware ? (
              <DetailField
                label="Software"
                value={
                  printer.softwareId != null
                    ? softwareLabelById.get(printer.softwareId) ??
                      "—"
                    : "Sin asignar"
                }
              />
            ) : null}
          </DetailSection>
        ),
      },
      {
        id: "technical",
        label: "Detalles",
        content: (
          <DetailSection title="Detalles técnicos" layout="quad">
            <DetailField
              label="Firmware"
              value={printer.versionFirmware || "—"}
              mono
            />
            <DetailField
              label="MAC"
              value={printer.macAddress || "—"}
              mono
            />
            <DetailField
              label="Llave de encriptación"
              value={printer.encryptionKey || printer.llaveEncrip || "—"}
              mono
            />
          </DetailSection>
        ),
      },
    ];
  }, [
    printer,
    model,
    modelLabel,
    user,
    isDistributor,
    distributors,
    distributorOptions,
    clients,
    clientLabelById,
    softwareLabelById,
    showSoftware,
    canAssignInitialized,
    statusQuickAction,
    seals,
    sealsLoading,
    canManageSeals,
  ]);

  async function handleAssignmentSubmit({
    distributorId,
    paid,
  }: {
    distributorId: number;
    paid: boolean;
  }) {
    if (!printer || !canAssignInitialized) {
      toast.error(CATALOG_MODIFY_FORBIDDEN_MESSAGE);
      return;
    }
    if (!isPrinterUnassigned(printer.status)) {
      toast.error("Solo se pueden asignar impresoras con estatus Sin asignar.");
      return;
    }

    setAssignmentSaving(true);
    setAssignmentError(null);

    try {
      const body = printerToAssignmentRequest(printer, distributorId, paid);
      const updated = await updatePrinter(printer.id, body);
      setPrinter(updated);
      toast.success(`Impresora ${printer.fiscalSerial} asignada correctamente.`, {
        href: printerPath(updated.id),
      });
      setAssignmentOpen(false);
    } catch (err) {
      const message = getPrintersErrorMessage(err);
      setAssignmentError(message);
      toast.error(message);
    } finally {
      setAssignmentSaving(false);
    }
  }

  function handleDispositionContinue({
    clientId,
    facturaNro,
  }: {
    clientId: number;
    facturaNro: string;
  }) {
    if (!printer || !canDisposeAssigned) {
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
    if (!isPrinterPaidForDisposition(printer)) {
      toast.error(PRINTER_UNPAID_DISPOSITION_MESSAGE);
      return;
    }
    setDispositionOpen(false);
    router.push(printerDispositionPath(printer.id, clientId, facturaNro));
  }

  async function handleSubmit(values: PrinterFormValues) {
    if (!printer || !canModify) {
      setFormError(CATALOG_MODIFY_FORBIDDEN_MESSAGE);
      return;
    }

    const bodyOrError = toPrinterEditRequest(values, printer);
    if (typeof bodyOrError === "string") {
      setFormError(bodyOrError);
      return;
    }

    if (lockDistributor && distributorId != null) {
      bodyOrError.distributorId = distributorId;
    }

    const isBackward = isBackwardPrinterStatusTransition({
      currentStatus: printer.status,
      newStatus: bodyOrError.status,
      currentClientId: printer.clientId,
      newClientId: bodyOrError.clientId,
      currentDistributorId: printer.distributorId,
      newDistributorId: bodyOrError.distributorId,
    });

    if (isBackward) {
      const currentClientLabel =
        printer.clientId != null
          ? clientLabelById.get(printer.clientId)
          : null;
      const currentDistributorLabel =
        printer.distributorId != null
          ? distributorOptions.find((d) => d.id === printer.distributorId)?.label
          : null;

      const consequences = buildPrinterRollbackConsequences({
        currentStatus: printer.status,
        newStatus: bodyOrError.status,
        currentClientId: printer.clientId,
        newClientId: bodyOrError.clientId,
        currentDistributorId: printer.distributorId,
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
                {printer.fiscalSerial}
              </strong>
              {" "}hacia un estado anterior.
            </p>
            <PrinterStatusTransition
              from={normalizePrinterStatus(printer.status)}
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

    setSaving(true);
    setFormError(null);

    try {
      const updated = await updatePrinter(printer.id, bodyOrError);
      setPrinter(updated);
      toast.success("Impresora actualizada.", {
        href: printerPath(updated.id),
      });
      setEditOpen(false);
    } catch (err) {
      const message = getPrintersErrorMessage(err);
      setFormError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  function openTicketReconfigure() {
    if (!printer) return;
    if (!isPrinterPaidForDisposition(printer)) {
      toast.error(PRINTER_UNPAID_DISPOSITION_MESSAGE);
      return;
    }
    setDispositionOpen(true);
  }

  async function handleDelete() {
    if (!printer || !canDelete) {
      toast.error(CATALOG_MODIFY_FORBIDDEN_MESSAGE);
      return;
    }
    if (!(await confirm({ title: "Confirmar", message: `¿Eliminar la impresora con serial ${printer.fiscalSerial}?`, destructive: true }))) {
      return;
    }

    setDeleting(true);
    try {
      await deletePrinter(printer.id);
      toast.success("Impresora eliminada.");
      router.push("/printers");
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
        toast.error(getPrintersErrorMessage(err));
      }
    } finally {
      setDeleting(false);
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
      router.push("/printers");
    } catch (err) {
      toast.error(getPrintersErrorMessage(err));
    } finally {
      setForceDeleting(false);
    }
  }

  return (
    <>
      <ResourceViewShell
        backHref="/printers"
        backLabel="Volver a impresoras"
        title={printer?.fiscalSerial ?? "Impresora"}
        subtitle={modelLabel}
        loading={loading}
        error={error}
        actions={
          printer ? (
            <div className="flex flex-wrap gap-2">
              {canManageSeals ? (
                <button
                  type="button"
                  onClick={() => setSealsDialogOpen(true)}
                  className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-foreground/5"
                >
                  <ShieldCheck className="size-4" aria-hidden />
                  Gestionar precintos
                </button>
              ) : null}
              {canOpenFiscalBook ? (
                <a
                  href={fiscalBooksAppUrl(printer.id)}
                  {...fiscalBookLinkProps}
                  className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-foreground/5"
                >
                  <BookOpen className="size-4" aria-hidden />
                  Libro fiscal
                </a>
              ) : null}
              {showTicketReconfigure ? (
                <button
                  type="button"
                  onClick={openTicketReconfigure}
                  className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-foreground/5"
                >
                  <RefreshCw className="size-4" aria-hidden />
                  {PRINTER_TICKET_RECONFIGURE_LABEL}
                </button>
              ) : null}
              <ResourceViewActions
                onEdit={
                  canModify
                    ? () => {
                        setFormError(null);
                        setEditOpen(true);
                      }
                    : undefined
                }
                onDelete={canDelete ? () => void handleDelete() : undefined}
                deleting={deleting}
              />
            </div>
          ) : undefined
        }
      >
        {printer &&
          (isDistributor ? (
            <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
              {distributorDetailContent}
            </div>
          ) : (
            <DetailSectionsPager key={printer.id} steps={adminDetailSteps} />
          ))}
      </ResourceViewShell>

      {printer && sealsDialogOpen ? (
        <PrinterSealsDialog
          key={`seals-${printer.id}`}
          open={sealsDialogOpen}
          printer={printer}
          seals={seals}
          onClose={() => setSealsDialogOpen(false)}
          onRefresh={loadSeals}
        />
      ) : null}

      {printer && assignmentOpen ? (
        <PrinterAssignmentDialog
          key={printer.id}
          printer={printer}
          saving={assignmentSaving}
          error={assignmentError}
          distributorOptions={distributorOptions}
          catalogLoading={catalogLoading}
          lockDistributor={lockDistributor}
          defaultDistributorId={distributorId}
          onClose={() => {
            if (!assignmentSaving) setAssignmentOpen(false);
          }}
          onSubmit={(payload) => void handleAssignmentSubmit(payload)}
        />
      ) : null}

      {printer && dispositionOpen ? (
        <PrinterDispositionDialog
          key={`disposition-${printer.id}`}
          printer={printer}
          clientOptions={clientOptions}
          clients={scopedClients}
          branches={branches}
          companies={companies}
          distributors={distributors}
          catalogLoading={catalogLoading}
          reconfigure={isPrinterPendingMqttEnajenacion(printer)}
          onClose={() => setDispositionOpen(false)}
          onContinue={handleDispositionContinue}
        />
      ) : null}

      {printer && editOpen && (
        <PrinterCreateWizardDialog
          mode="edit"
          open={editOpen}
          saving={saving}
          error={formError}
          initialValues={printerToFormValues(printer)}
          modelOptions={modelOptions}
          softwareOptions={software}
          clientOptions={clientOptions}
          distributorOptions={distributorOptions}
          modelsLoading={modelsLoading}
          catalogLoading={catalogLoading}
          canPickSoftware={showSoftware}
          lockDistributor={lockDistributor}
          defaultDistributorId={distributorId}
          onClose={() => {
            if (!saving) setEditOpen(false);
          }}
          onSubmit={handleSubmit}
        />
      )}

      <PrinterDeleteBlockedDialog
        open={deleteBlocked != null}
        printerLabel={deleteBlocked?.printerLabel ?? ""}
        message={
          deleteBlocked?.message ??
          "Esta impresora tiene registros vinculados."
        }
        dependencies={deleteBlocked?.dependencies ?? []}
        consequences={deleteBlocked?.consequences ?? []}
        forcing={forceDeleting}
        onClose={() => {
          if (!forceDeleting) setDeleteBlocked(null);
        }}
        onForceDelete={handleForceDelete}
      />
    </>
  );
}
