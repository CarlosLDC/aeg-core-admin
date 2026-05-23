"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PrinterCreateWizardDialog } from "@/components/printers/printer-create-wizard-dialog";
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
  canDeletePrinterRecord,
  canModifyPrinterRecord,
  CATALOG_MODIFY_FORBIDDEN_MESSAGE,
} from "@/lib/api-permissions";
import { assertPrinterInScope } from "@/lib/permissions/scope-access";
import { distributorLabel } from "@/lib/branch-roles";
import { formatBranchShort } from "@/lib/branches";
import { fetchBranches } from "@/lib/branches-api";
import { fetchClients } from "@/lib/clients-api";
import { fetchCompanies } from "@/lib/companies-api";
import { fetchDistributors } from "@/lib/distributors-api";
import { formatDate, formatMoney } from "@/lib/datetime-form";
import {
  DEVICE_TYPE_LABELS,
  printerModelLabel,
  printerToFormValues,
  toPrinterRequest,
  type PrinterFormValues,
} from "@/lib/printer-form";
import { fetchPrinterModels } from "@/lib/printer-models-api";
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
  const isDistributor = user?.role === "DISTRIBUTOR";

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
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const lockDistributor = isDistributor && distributorId != null;

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
      fetchPrinterModels(),
      fetchSoftware(),
      scope ? Promise.resolve(scope.companies) : fetchCompanies(),
      scope ? Promise.resolve(scope.branches) : fetchBranches(),
      fetchDistributors(),
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
  }, [scope]);

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
        ? clients.filter((c) => c.distributorId === distributorId)
        : clients;
    return scopedClients
      .map((c) => ({
        id: c.id,
        label: clientLabel(c, branches, companies),
      }))
      .sort((a, b) => a.label.localeCompare(b.label, "es"));
  }, [clients, branches, companies, lockDistributor, distributorId]);

  const model = printer
    ? models.find((m) => m.id === printer.modelId)
    : undefined;
  const modelLabel = model
    ? `${model.brand} ${model.modelCode}`
    : printer
      ? "Modelo desconocido"
      : "";

  const distributorLabelById = useMemo(
    () =>
      new Map(
        distributorOptions.map((opt) => [opt.id, opt.label]),
      ),
    [distributorOptions],
  );
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
              value={<PrinterStatusBadge status={printer.status} />}
            />
            <DetailField
              label="Precio venta"
              value={formatMoney(printer.finalSalePrice)}
            />
            <DetailField
              label="Estado de pago"
              value={printer.paid ? "Pagada" : "Pendiente"}
            />
            <DetailField
              label="Instalación"
              value={formatDate(printer.installationDate)}
            />
          </DetailSection>
        ),
      },
      {
        id: "assignment",
        label: "Asignación",
        content: (
          <DetailSection title="Asignación" layout="quad">
            <DetailField
              label="Distribuidor"
              value={
                printer.distributorId != null
                  ? distributorLabelById.get(printer.distributorId) ??
                    "—"
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
    distributors,
    clients,
    distributorLabelById,
    clientLabelById,
    softwareLabelById,
  ]);

  async function handleSubmit(values: PrinterFormValues) {
    if (!printer || !canModify) {
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
