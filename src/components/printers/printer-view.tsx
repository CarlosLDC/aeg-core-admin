"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  PrinterFormDialog,
  type SelectOption,
} from "@/components/printers/printer-form-dialog";
import { DetailCard, DetailField } from "@/components/resource-view/detail-fields";
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
  PRINTER_STATUS_LABELS,
  printerModelLabel,
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
import { printerModelPath, printerPath } from "@/lib/resource-routes";
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
  if (!branch) return `Cliente #${client.id}`;
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
            label: `#${s.id} · ${s.name}`,
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
        .map((m) => ({ id: m.id, label: `#${m.id} · ${printerModelLabel(m)}` })),
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
        label: `#${d.id} · ${distributorLabel(d, branches, companies)}`,
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
        label: `#${c.id} · ${clientLabel(c, branches, companies)}`,
      }))
      .sort((a, b) => a.label.localeCompare(b.label, "es"));
  }, [clients, branches, companies, lockDistributor, distributorId]);

  const model = printer
    ? models.find((m) => m.id === printer.modelId)
    : undefined;
  const modelLabel = model
    ? `${model.brand} ${model.modelCode}`
    : printer
      ? `Modelo #${printer.modelId}`
      : "";

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
          <DetailCard>
            <DetailField label="ID" value={String(printer.id)} mono />
            <DetailField
              label="Serial fiscal"
              value={printer.fiscalSerial}
              mono
            />
            <DetailField
              label="Modelo"
              value={modelLabel}
              href={model ? printerModelPath(model.id) : undefined}
              fullWidth
            />
            <DetailField
              label="Estatus"
              value={PRINTER_STATUS_LABELS[printer.status]}
            />
            <DetailField
              label="Tipo de equipo"
              value={DEVICE_TYPE_LABELS[printer.deviceType]}
            />
            <DetailField label="Pagada" value={printer.paid ? "Sí" : "No"} />
            <DetailField
              label="Precio venta"
              value={formatMoney(printer.finalSalePrice)}
            />
            <DetailField
              label="Instalación"
              value={formatDate(printer.installationDate)}
            />
            <DetailField
              label="Firmware"
              value={printer.versionFirmware || "—"}
            />
            <DetailField
              label="MAC"
              value={printer.macAddress || "—"}
              mono
            />
            <DetailField
              label="Registrada"
              value={formatDate(printer.createdAt)}
            />
          </DetailCard>
        )}
      </ResourceViewShell>

      {printer && editOpen && (
        <PrinterFormDialog
          mode="edit"
          printer={printer}
          open={editOpen}
          saving={saving}
          deleting={deleting}
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
          onClose={() => {
            if (!saving && !deleting) setEditOpen(false);
          }}
          onSubmit={handleSubmit}
          onDelete={() => void handleDelete()}
        />
      )}
    </>
  );
}
