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
import {
  PRINTER_UNPAID_DISPOSITION_MESSAGE,
} from "@/lib/printer-form";
import {
  disposePrinter,
  fetchPrinterById,
  getPrintersErrorMessage,
} from "@/lib/printers-api";
import { fetchAuthMe } from "@/lib/auth-me-api";
import { printerPath } from "@/lib/resource-routes";
import { isPrinterAssigned } from "@/lib/printer-status";
import {
  buildDispositionInvoiceData,
  normalizeFacturaNroInput,
  validateFacturaNroInput,
  type VenezuelanFiscalInvoiceData,
} from "@/lib/venezuelan-fiscal-invoice";
import {
  applyPrinterTicketToDispositionInvoice,
  extractEnajenacionTicketFromInvoice,
} from "@/lib/enajenacion-ticket";
import { isPrinterPendingMqttEnajenacion } from "@/lib/printer-enajenacion-ticket";
import type { BranchResponse } from "@/types/branch";
import type { ClientResponse, DistributorResponse } from "@/types/branch-role";
import type { CompanyResponse } from "@/types/company";
import type { PrinterResponse } from "@/types/printer";
import { isDistributorPanelRole } from "@/types/user";
import { cn } from "@/lib/utils";

type PrinterDispositionViewProps = {
  onPrinterLoaded?: (printer: PrinterResponse) => void;
};

export function PrinterDispositionView({
  onPrinterLoaded,
}: PrinterDispositionViewProps = {}) {
  const id = useResourceId();
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const { user } = useAuth();
  const { scope } = useCompanyScope();
  const canDispose = user ? canDisposePrinterRecord(user.role) : false;
  const isAdmin = user?.role === "ADMIN";
  const isDistributor = isDistributorPanelRole(user?.role);

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

  const distributorStaffBranchId = useDistributorStaffBranchId(
    isDistributor ? distributorId : null,
  );
  const canDisposeAssigned =
    canDispose && (isAdmin || (isDistributor && distributorId != null));

  const clientIdParam = searchParams.get("clientId");
  const facturaNroParam = searchParams.get("facturaNro");
  const clientId = useMemo(() => {
    const parsed = Number(clientIdParam);
    if (!Number.isFinite(parsed) || parsed <= 0) return null;
    return parsed;
  }, [clientIdParam]);
  const facturaNro = useMemo(() => {
    if (!facturaNroParam) return null;
    return normalizeFacturaNroInput(facturaNroParam);
  }, [facturaNroParam]);

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
      setPrinter(data);
      onPrinterLoaded?.(data);
      if (!isPrinterAssigned(data.status)) {
        setError("Solo se pueden enajenar impresoras con estatus Asignada.");
        return;
      }
      if (!data.paid) {
        setError(PRINTER_UNPAID_DISPOSITION_MESSAGE);
        return;
      }
    } catch (err) {
      setError(getPrintersErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [id, scope, user, distributorId, onPrinterLoaded]);

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

  const selectedContributorType = useMemo(() => {
    if (clientId == null) return "ordinario" as const;
    const client = scopedClients.find((entry) => entry.id === clientId);
    if (!client) return "ordinario" as const;
    const branch = branches.find((entry) => entry.id === client.branchId);
    const company = companies.find((entry) => entry.id === branch?.companyId);
    return company?.contributorType ?? "ordinario";
  }, [clientId, scopedClients, branches, companies]);

  const invoiceData = useMemo(() => {
    if (!printer || clientId == null || facturaNro == null) {
      return null;
    }
    return buildDispositionInvoiceData({
      clientId,
      clients: scopedClients,
      branches,
      companies,
      distributors,
      printer,
      facturaNro,
    });
  }, [
    printer,
    clientId,
    facturaNro,
    scopedClients,
    branches,
    companies,
    distributors,
  ]);

  useEffect(() => {
    if (!invoiceData || !printer) {
      queueMicrotask(() => {
        setInvoiceDraft(null);
        setInvoiceBaseline(null);
      });
      return;
    }
    const merged = applyPrinterTicketToDispositionInvoice(
      invoiceData,
      printer.header,
      printer.trailer,
      selectedContributorType,
    );
    queueMicrotask(() => {
      setInvoiceDraft(merged);
      setInvoiceBaseline(merged);
      setInvoiceEditSessionKey((current) => current + 1);
    });
  }, [invoiceData, printer, selectedContributorType]);

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
      return "Selecciona un cliente válido.";
    }
    if (
      isDistributor &&
      isDistributorSelfClient(
        clientId,
        scopedClients,
        distributorStaffBranchId,
      )
    ) {
      return DISTRIBUTOR_SELF_CLIENT_MESSAGE;
    }
    return null;
  }, [clientId, scopedClients, isDistributor, distributorStaffBranchId]);

  const facturaValidationError = useMemo(() => {
    if (!facturaNroParam) {
      return "Ingresa el número de factura en el diálogo de enajenación.";
    }
    return validateFacturaNroInput(facturaNroParam);
  }, [facturaNroParam]);

  const invoiceGenerationError = useMemo(() => {
    if (facturaValidationError || invoiceData != null) return null;
    if (clientId == null) return null;
    return "No se pudo generar la factura para este cliente.";
  }, [facturaValidationError, invoiceData, clientId]);

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
    if (!printer.paid) {
      toast.error(PRINTER_UNPAID_DISPOSITION_MESSAGE);
      return;
    }
    if (clientValidationError || clientId == null) {
      setFormError(clientValidationError ?? "Cliente no válido.");
      return;
    }
    if (!invoiceDraft) {
      setFormError(invoiceGenerationError ?? "Factura no disponible.");
      return;
    }

    setFormError(null);
    setSaving(true);

    try {
      const ticket = extractEnajenacionTicketFromInvoice(
        invoiceDraft,
        selectedContributorType,
      );
      await disposePrinter(printer.id, {
        clientId,
        header: ticket.header,
        trailer: ticket.trailer,
      });
      toast.success(
        isPrinterPendingMqttEnajenacion(printer)
          ? `Configuración de ticket actualizada para ${printer.fiscalSerial}.`
          : `Configuración de ticket guardada para ${printer.fiscalSerial}. La impresora puede iniciar el ritual Remoto.`,
        {
          href: printerPath(printer.id),
        },
      );
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

  const backHref = "/printers";

  return (
    <ResourceViewShell
      loading={loading || catalogLoading}
      error={
        error ??
        accessError ??
        clientValidationError ??
        facturaValidationError ??
        invoiceGenerationError
      }
    >
      {printer &&
      isPrinterAssigned(printer.status) &&
      canDisposeAssigned &&
      invoiceDraft ? (
        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="mx-auto flex w-full max-w-4xl flex-col items-center gap-6"
        >
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
              {printer.header?.lines?.length
                ? "Guardar cambios de ticket"
                : "Confirmar configuración de ticket"}
            </button>
          </div>
        </form>
      ) : null}
    </ResourceViewShell>
  );
}
