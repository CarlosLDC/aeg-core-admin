"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PrinterAssignmentDialog } from "@/components/printers/printer-assignment-dialog";
import { PrinterCreateWizardDialog } from "@/components/printers/printer-create-wizard-dialog";
import { PrinterDispositionDialog } from "@/components/printers/printer-disposition-dialog";
import type { SelectOption } from "@/components/printers/printer-form-dialog";
import {
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
import { ResourceViewActions } from "@/components/resource-view/resource-view-actions";
import { ResourceViewShell } from "@/components/resource-view/resource-view-shell";
import { useAuth } from "@/context/auth-provider";
import { useCompanyScope } from "@/context/company-scope-provider";
import { useToast } from "@/context/toast-provider";
import { useConfirm } from "@/context/confirm-provider";
import { useResourceId } from "@/hooks/use-resource-id";
import {
  canDisposePrinterRecord,
  canDeletePrinterRecord,
  canModifyPrinterRecord,
  CATALOG_MODIFY_FORBIDDEN_MESSAGE,
} from "@/lib/api-permissions";
import {
  DISTRIBUTOR_SELF_CLIENT_MESSAGE,
  excludeDistributorSelfClients,
  isDistributorSelfClient,
} from "@/lib/distributor-scope";
import {
  isPrinterAssigned,
  isPrinterUnassigned,
} from "@/lib/printer-status";
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
  printerToAssignmentRequest,
  printerToDispositionRequest,
  printerToFormValues,
  toPrinterRequest,
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
  updatePrinter,
} from "@/lib/printers-api";
import { fetchAuthMe } from "@/lib/auth-me-api";
import { fetchSoftware } from "@/lib/software-api";
import { printerPath } from "@/lib/resource-routes";
import type { BranchResponse } from "@/types/branch";
import type { ClientResponse, DistributorResponse } from "@/types/branch-role";
import type { CompanyResponse } from "@/types/company";
import type { PrinterModelResponse } from "@/types/printer-model";
import type { PrinterResponse } from "@/types/printer";

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
  const isDistributor = user?.role === "DISTRIBUTOR";
  const canAssignInitialized = isAdmin && canModify;
  const canDispose = user ? canDisposePrinterRecord(user.role) : false;

  const [printer, setPrinter] = useState<PrinterResponse | null>(null);
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
  const [dispositionSaving, setDispositionSaving] = useState(false);
  const [dispositionError, setDispositionError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const lockDistributor = isDistributor && distributorId != null;
  const canDisposeAssigned = isDistributor && canDispose && distributorId != null;
  const distributorStaffBranchId = useDistributorStaffBranchId(
    isDistributor ? distributorId : null,
  );

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
  }, [load]);

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
      fetchSoftware(),
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
  }, [scope, isDistributor]);

  useEffect(() => {
    if (!printer) return;
    if (missingPrinterModelIds([printer], models).length === 0) return;

    let cancelled = false;
    void fetchMissingPrinterModels([printer], models).then((next) => {
      if (!cancelled && next.length > models.length) setModels(next);
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

  const clientOptions = useMemo<SelectOption[]>(() => {
    const scopedClients =
      lockDistributor && distributorId != null
        ? excludeDistributorSelfClients(
            clients.filter((c) => c.distributorId === distributorId),
            distributorStaffBranchId,
          )
        : clients;
    return scopedClients
      .map((c) => ({
        id: c.id,
        label: clientLabel(c, branches, companies),
      }))
      .sort((a, b) => a.label.localeCompare(b.label, "es"));
  }, [
    clients,
    branches,
    companies,
    lockDistributor,
    distributorId,
    distributorStaffBranchId,
  ]);

  const model = printer
    ? models.find((m) => m.id === printer.modelId)
    : undefined;
  const modelLabel = model
    ? `${model.brand} ${model.modelCode}`
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

  const detailSteps = useMemo(() => {
    if (!printer) return [];

    return [
      {
        id: "equipment",
        label: "Equipo",
        content: (
          <DetailSection title="Equipo fiscal" layout="quad">
            <DetailField label="ID" value={String(printer.id)} mono />
            <DetailField
              label="Registrada"
              value={formatDate(printer.createdAt)}
            />
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
                <PrinterStatusBadge
                  status={printer.status}
                  onClick={
                    canAssignInitialized && isPrinterUnassigned(printer.status)
                      ? () => {
                          setAssignmentError(null);
                          setAssignmentOpen(true);
                        }
                      : canDisposeAssigned && isPrinterAssigned(printer.status)
                        ? () => {
                            setDispositionError(null);
                            setDispositionOpen(true);
                          }
                        : undefined
                  }
                  actionLabel={
                    canAssignInitialized && isPrinterUnassigned(printer.status)
                      ? "Asignar impresora"
                      : canDisposeAssigned && isPrinterAssigned(printer.status)
                        ? "Enajenar impresora"
                        : undefined
                  }
                />
              }
            />
            <DetailField
              label="Estado de pago"
              value={printer.paid ? "Pagada" : "Pendiente"}
            />
            <DetailField
              label="Fecha de enajenación"
              value={formatDate(printer.installationDate)}
            />
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
            <DetailField
              label="Software"
              value={
                printer.softwareId != null
                  ? softwareLabelById.get(printer.softwareId) ??
                    "—"
                  : "Sin asignar"
              }
            />
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
    canAssignInitialized,
    canDisposeAssigned,
  ]);

  async function handleAssignmentSubmit(distributorId: number) {
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
      const body = printerToAssignmentRequest(printer, distributorId);
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

  async function handleDispositionSubmit(clientId: number) {
    if (!printer || !canDisposeAssigned) {
      toast.error(CATALOG_MODIFY_FORBIDDEN_MESSAGE);
      return;
    }
    if (!isPrinterAssigned(printer.status)) {
      toast.error("Solo se pueden enajenar impresoras con estatus Asignada.");
      return;
    }
    if (!clientOptions.some((option) => option.id === clientId)) {
      toast.error("Selecciona un cliente válido de tu distribuidora.");
      return;
    }
    if (
      isDistributorSelfClient(
        clientId,
        clients,
        distributorStaffBranchId,
      )
    ) {
      toast.error(DISTRIBUTOR_SELF_CLIENT_MESSAGE);
      return;
    }

    setDispositionSaving(true);
    setDispositionError(null);

    try {
      const body = printerToDispositionRequest(printer, clientId);
      const updated = await updatePrinter(printer.id, body);
      setPrinter(updated);
      toast.success(`Impresora ${printer.fiscalSerial} enajenada correctamente.`, {
        href: printerPath(updated.id),
      });
      setDispositionOpen(false);
    } catch (err) {
      const message = getPrintersErrorMessage(err);
      setDispositionError(message);
      toast.error(message);
    } finally {
      setDispositionSaving(false);
    }
  }

  async function handleSubmit(values: PrinterFormValues) {
    if (!printer || !canModify) {
      setFormError(CATALOG_MODIFY_FORBIDDEN_MESSAGE);
      return;
    }

    const bodyOrError = toPrinterRequest(values, {
      finalSalePrice: printer.finalSalePrice,
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
      toast.error(getPrintersErrorMessage(err));
    } finally {
      setDeleting(false);
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
          ) : undefined
        }
      >
        {printer && (
          <DetailSectionsPager key={printer.id} steps={detailSteps} />
        )}
      </ResourceViewShell>

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
          onSubmit={(id) => void handleAssignmentSubmit(id)}
        />
      ) : null}

      {printer && dispositionOpen ? (
        <PrinterDispositionDialog
          key={`disposition-${printer.id}`}
          printer={printer}
          saving={dispositionSaving}
          error={dispositionError}
          clientOptions={clientOptions}
          catalogLoading={catalogLoading}
          onClose={() => {
            if (!dispositionSaving) setDispositionOpen(false);
          }}
          onSubmit={(id) => void handleDispositionSubmit(id)}
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
          canPickSoftware={user?.role === "ADMIN"}
          lockDistributor={lockDistributor}
          defaultDistributorId={distributorId}
          onClose={() => {
            if (!saving) setEditOpen(false);
          }}
          onSubmit={handleSubmit}
        />
      )}
    </>
  );
}
