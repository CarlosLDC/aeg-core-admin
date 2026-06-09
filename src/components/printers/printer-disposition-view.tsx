"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { VenezuelanFiscalInvoicePreview } from "@/components/printers/venezuelan-fiscal-invoice-preview";
import { ResourceViewShell } from "@/components/resource-view/resource-view-shell";
import { useAuth } from "@/context/auth-provider";
import { useCompanyScope } from "@/context/company-scope-provider";
import { useToast } from "@/context/toast-provider";
import { useDistributorStaffBranchId } from "@/hooks/use-distributor-staff-branch-id";
import { useResourceId } from "@/hooks/use-resource-id";
import {
  canDisposePrinterRecord,
  CATALOG_MODIFY_FORBIDDEN_MESSAGE,
} from "@/lib/api-permissions";
import { assertPrinterInScope } from "@/lib/permissions/scope-access";
import { fetchBranches } from "@/lib/branches-api";
import { fetchClients } from "@/lib/clients-api";
import { fetchCompanies } from "@/lib/companies-api";
import { fetchDistributors } from "@/lib/distributors-api";
import {
  DISTRIBUTOR_SELF_CLIENT_MESSAGE,
  isDistributorSelfClient,
} from "@/lib/distributor-scope";
import { printerToDispositionRequest } from "@/lib/printer-form";
import {
  fetchPrinterById,
  getPrintersErrorMessage,
  updatePrinter,
} from "@/lib/printers-api";
import { fetchAuthMe } from "@/lib/auth-me-api";
import { printerPath } from "@/lib/resource-routes";
import { isPrinterAssigned } from "@/lib/printer-status";
import {
  buildDispositionInvoiceData,
  validateFacturaNroInput,
  type VenezuelanFiscalInvoiceData,
} from "@/lib/venezuelan-fiscal-invoice";
import type { BranchResponse } from "@/types/branch";
import type { ClientResponse, DistributorResponse } from "@/types/branch-role";
import type { CompanyResponse } from "@/types/company";
import type { PrinterResponse } from "@/types/printer";
import { cn } from "@/lib/utils";

export function PrinterDispositionView() {
  const id = useResourceId();
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const { user } = useAuth();
  const { scope } = useCompanyScope();
  const canDispose = user ? canDisposePrinterRecord(user.role) : false;
  const isDistributor = user?.role === "DISTRIBUTOR";

  const [printer, setPrinter] = useState<PrinterResponse | null>(null);
  const [branches, setBranches] = useState<BranchResponse[]>([]);
  const [companies, setCompanies] = useState<CompanyResponse[]>([]);
  const [clients, setClients] = useState<ClientResponse[]>([]);
  const [distributors, setDistributors] = useState<DistributorResponse[]>([]);
  const [distributorId, setDistributorId] = useState<number | null>(
    user?.distributorId ?? null,
  );
  const [loading, setLoading] = useState(true);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [invoiceDraft, setInvoiceDraft] =
    useState<VenezuelanFiscalInvoiceData | null>(null);
  const [invoiceBaseline, setInvoiceBaseline] =
    useState<VenezuelanFiscalInvoiceData | null>(null);
  const [invoiceEditSessionKey, setInvoiceEditSessionKey] = useState(0);
  const [facturaNroInput, setFacturaNroInput] = useState("");
  const [confirmedFacturaNro, setConfirmedFacturaNro] = useState<string | null>(
    null,
  );
  const [facturaNroError, setFacturaNroError] = useState<string | null>(null);

  const distributorStaffBranchId = useDistributorStaffBranchId(
    isDistributor ? distributorId : null,
  );
  const canDisposeAssigned =
    isDistributor && canDispose && distributorId != null;

  const clientIdParam = searchParams.get("clientId");
  const clientId = useMemo(() => {
    const parsed = Number(clientIdParam);
    if (!Number.isFinite(parsed) || parsed <= 0) return null;
    return parsed;
  }, [clientIdParam]);

  const scopedClients = useMemo(() => {
    if (distributorId == null) return clients;
    return clients.filter((c) => c.distributorId === distributorId);
  }, [clients, distributorId]);

  const loadPrinter = useCallback(async () => {
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
      if (!isPrinterAssigned(data.status)) {
        setError("Solo se pueden enajenar impresoras con estatus Asignada.");
        setPrinter(data);
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
    queueMicrotask(() => {
      void loadPrinter();
    });
  }, [loadPrinter]);

  useEffect(() => {
    if (!isDistributor) return;
    if (user?.distributorId != null) {
      queueMicrotask(() => setDistributorId(user.distributorId));
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
    queueMicrotask(() => setCatalogLoading(true));
    Promise.all([
      scope ? Promise.resolve(scope.companies) : fetchCompanies(),
      scope ? Promise.resolve(scope.branches) : fetchBranches(),
      fetchClients(),
      fetchDistributors(),
    ])
      .then(([companyRows, branchRows, clientRows, distributorRows]) => {
        if (!cancelled) {
          setCompanies(companyRows);
          setBranches(branchRows);
          setClients(clientRows);
          setDistributors(distributorRows);
        }
      })
      .finally(() => {
        if (!cancelled) setCatalogLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [scope]);

  useEffect(() => {
    queueMicrotask(() => {
      setFacturaNroInput("");
      setConfirmedFacturaNro(null);
      setFacturaNroError(null);
    });
  }, [clientId]);

  const invoiceData = useMemo(() => {
    if (!printer || clientId == null || confirmedFacturaNro == null) {
      return null;
    }
    return buildDispositionInvoiceData({
      clientId,
      clients: scopedClients,
      branches,
      companies,
      distributors,
      printer,
      facturaNro: confirmedFacturaNro,
    });
  }, [
    printer,
    clientId,
    confirmedFacturaNro,
    scopedClients,
    branches,
    companies,
    distributors,
  ]);

  useEffect(() => {
    if (!invoiceData) {
      queueMicrotask(() => {
        setInvoiceDraft(null);
        setInvoiceBaseline(null);
      });
      return;
    }
    queueMicrotask(() => {
      setInvoiceDraft(invoiceData);
      setInvoiceBaseline(invoiceData);
      setInvoiceEditSessionKey((current) => current + 1);
    });
  }, [invoiceData]);

  const hasInvoiceChanges = useMemo(() => {
    if (!invoiceDraft || !invoiceBaseline) return false;
    return JSON.stringify(invoiceDraft) !== JSON.stringify(invoiceBaseline);
  }, [invoiceDraft, invoiceBaseline]);

  function handleRevertInvoice() {
    if (!invoiceBaseline) return;
    setInvoiceDraft(invoiceBaseline);
    setInvoiceEditSessionKey((current) => current + 1);
  }

  const clientValidationError = useMemo(() => {
    if (clientId == null) {
      return "Selecciona un cliente válido para continuar.";
    }
    if (!scopedClients.some((client) => client.id === clientId)) {
      return "Selecciona un cliente válido de tu distribuidora.";
    }
    if (
      isDistributorSelfClient(
        clientId,
        scopedClients,
        distributorStaffBranchId,
      )
    ) {
      return DISTRIBUTOR_SELF_CLIENT_MESSAGE;
    }
    return null;
  }, [clientId, scopedClients, distributorStaffBranchId]);

  const invoiceGenerationError = useMemo(() => {
    if (confirmedFacturaNro == null || invoiceData != null) return null;
    return "No se pudo generar la factura para este cliente.";
  }, [confirmedFacturaNro, invoiceData]);

  function handleFacturaNroSubmit(e: FormEvent) {
    e.preventDefault();
    const validation = validateFacturaNroInput(facturaNroInput);
    if (validation) {
      setFacturaNroError(validation);
      return;
    }
    setFacturaNroError(null);
    setConfirmedFacturaNro(facturaNroInput.trim());
  }

  function handleChangeFacturaNro() {
    setConfirmedFacturaNro(null);
    setInvoiceDraft(null);
    setInvoiceBaseline(null);
    setFacturaNroError(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!printer || !canDisposeAssigned) {
      toast.error(CATALOG_MODIFY_FORBIDDEN_MESSAGE);
      return;
    }
    if (!isPrinterAssigned(printer.status)) {
      toast.error("Solo se pueden enajenar impresoras con estatus Asignada.");
      return;
    }
    if (clientValidationError || clientId == null) {
      setFormError(clientValidationError ?? "Cliente no válido.");
      return;
    }
    if (!invoiceData) {
      setFormError(invoiceGenerationError ?? "Factura no disponible.");
      return;
    }

    setFormError(null);
    setSaving(true);

    try {
      const body = printerToDispositionRequest(printer, clientId);
      await updatePrinter(printer.id, body);
      toast.success(`Impresora ${printer.fiscalSerial} enajenada correctamente.`, {
        href: printerPath(printer.id),
      });
      router.push(printerPath(printer.id));
    } catch (err) {
      const message = getPrintersErrorMessage(err);
      setFormError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  const accessError =
    !canDisposeAssigned && !loading
      ? "No tienes permiso para enajenar impresoras."
      : null;

  const backHref = id != null ? printerPath(id) : "/printers";

  return (
    <ResourceViewShell
      backHref={backHref}
      backLabel="Volver a la impresora"
      title="Revisión de encabezado y pie de ticket"
      subtitle={
        printer
          ? `Serial fiscal ${printer.fiscalSerial}`
          : "Revisión de factura de enajenación"
      }
      loading={loading || catalogLoading}
      error={error ?? accessError ?? clientValidationError}
    >
      {printer &&
      isPrinterAssigned(printer.status) &&
      canDisposeAssigned &&
      !clientValidationError &&
      confirmedFacturaNro == null ? (
        <form
          onSubmit={handleFacturaNroSubmit}
          className="mx-auto flex w-full max-w-md flex-col gap-4"
        >
          <div className="space-y-2">
            <label
              htmlFor="factura-nro"
              className="block text-sm font-medium text-foreground"
            >
              Número de factura
            </label>
            <p className="text-sm text-muted">
              Ingresa el número fiscal antes de revisar el ticket de enajenación.
            </p>
            <input
              id="factura-nro"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={facturaNroInput}
              onChange={(e) => {
                setFacturaNroInput(e.target.value);
                setFacturaNroError(null);
              }}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm tabular-nums"
              placeholder="Ej. 00012345"
            />
            {facturaNroError ? (
              <p
                role="alert"
                className="text-sm text-rose-600 dark:text-rose-400"
              >
                {facturaNroError}
              </p>
            ) : null}
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => router.push(backHref)}
              className="rounded-lg px-4 py-2 text-sm font-medium text-muted hover:bg-foreground/5"
            >
              Volver
            </button>
            <button
              type="submit"
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground"
            >
              Continuar
            </button>
          </div>
        </form>
      ) : null}

      {printer &&
      isPrinterAssigned(printer.status) &&
      canDisposeAssigned &&
      confirmedFacturaNro != null &&
      invoiceGenerationError ? (
        <p
          role="alert"
          className="mx-auto w-full max-w-md rounded-lg border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300"
        >
          {invoiceGenerationError}
        </p>
      ) : null}

      {printer &&
      isPrinterAssigned(printer.status) &&
      canDisposeAssigned &&
      invoiceDraft ? (
        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="mx-auto flex w-full max-w-4xl flex-col items-center gap-6"
        >
          <div className="flex w-full items-center justify-between gap-3 text-sm text-muted">
            <span>
              Factura #{" "}
              <span className="font-medium tabular-nums text-foreground">
                {confirmedFacturaNro}
              </span>
            </span>
            <button
              type="button"
              onClick={handleChangeFacturaNro}
              className="text-accent hover:underline"
            >
              Cambiar número
            </button>
          </div>
          <VenezuelanFiscalInvoicePreview
            key={invoiceEditSessionKey}
            data={invoiceDraft}
            editable
            hasChanges={hasInvoiceChanges}
            onChange={setInvoiceDraft}
            onRevert={handleRevertInvoice}
          />

          {formError ? (
            <p
              role="alert"
              className="w-full rounded-lg border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300"
            >
              {formError}
            </p>
          ) : null}

          <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end [&_button]:w-full sm:[&_button]:w-auto">
            <button
              type="button"
              onClick={() => router.push(backHref)}
              disabled={saving}
              className="rounded-lg px-4 py-2 text-sm font-medium text-muted hover:bg-foreground/5 disabled:opacity-50"
            >
              Volver
            </button>
            <button
              type="submit"
              disabled={saving}
              className={cn(
                "inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground",
                saving && "cursor-not-allowed opacity-70",
              )}
            >
              {saving && <Loader2 className="size-4 animate-spin" />}
              Confirmar enajenación
            </button>
          </div>
        </form>
      ) : null}
    </ResourceViewShell>
  );
}
