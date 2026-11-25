"use client";

import { FormEvent, useEffect, useId, useMemo, useState } from "react";
import { FileText, Loader2, ReceiptText, User, Wifi } from "lucide-react";
import { useAuth } from "@/context/auth-provider";
import { useToast } from "@/context/toast-provider";
import type { SelectOption } from "@/components/printers/printer-form-dialog";
import { PrinterActionDialogShell } from "@/components/printers/printer-action-dialog-shell";
import { PrinterActionPickerPanel } from "@/components/printers/printer-action-picker-panel";
import { PrinterUsbWifiStep } from "@/components/printers/printer-usb-wifi-step";
import { VenezuelanFiscalInvoicePreview } from "@/components/printers/venezuelan-fiscal-invoice-preview";
import { useUsbWifiConfig } from "@/hooks/use-usb-wifi-config";
import {
  canDisposePrinterRecord,
  CATALOG_MODIFY_FORBIDDEN_MESSAGE,
} from "@/lib/api-permissions";
import { fetchBranchById } from "@/lib/branches-api";
import { clientRif } from "@/lib/branch-roles";
import { createClient } from "@/lib/clients-api";
import {
  applyPrinterTicketToDispositionInvoice,
  extractEnajenacionTicketFromInvoice,
} from "@/lib/enajenacion-ticket";
import {
  DISPOSITION_WIZARD_STEPS,
  resolveDispositionInitialStep,
  resolveDispositionPreviousStep,
  resolveDispositionStepSubtitle,
  resolveDispositionSubmitLabel,
  type DispositionWizardStep,
} from "@/lib/printer-disposition-wizard";
import { isPrinterPendingMqttEnajenacion } from "@/lib/printer-enajenacion-ticket";
import {
  getPrinterDispositionBlockedMessage,
  isPrinterPaidForDisposition,
  printerDispositionModalTitle,
} from "@/lib/printer-form";
import { isPrinterAssignedToDistributor } from "@/lib/printer-status";
import {
  disposePrinter,
  fetchPrinterById,
  getPrintersErrorMessage,
} from "@/lib/printers-api";
import { printerPath } from "@/lib/resource-routes";
import { formFieldInputClass } from "@/lib/toggle-button-styles";
import { normalizeRif, RIF_PATTERN } from "@/lib/seniat-extract";
import { matchesSearch } from "@/components/ui/searchable-select";
import { cn } from "@/lib/utils";
import {
  buildDispositionInvoiceData,
  normalizeFacturaNroInput,
  resolveClientCompanyName,
  resolveClientCompanyRif,
  resolveClientContributorType,
  validateFacturaNroInput,
  type VenezuelanFiscalInvoiceData,
} from "@/lib/venezuelan-fiscal-invoice";
import type { BranchResponse } from "@/types/branch";
import type { ClientResponse, DistributorResponse } from "@/types/branch-role";
import type { CompanyResponse } from "@/types/company";
import type { PrinterResponse } from "@/types/printer";

type PrinterDispositionDialogProps = {
  printer: PrinterResponse;
  clientOptions: SelectOption[];
  clients: ClientResponse[];
  branches: BranchResponse[];
  companies: CompanyResponse[];
  distributors: DistributorResponse[];
  catalogLoading: boolean;
  reconfigure?: boolean;
  onClose: () => void;
  onCompleted: (
    updatedPrinter: PrinterResponse,
    createdClient?: ClientResponse,
  ) => Promise<void> | void;
};

const STEP_ICONS = {
  1: User,
  2: FileText,
  3: ReceiptText,
  4: Wifi,
} as const;

function resolveDefaultClientId(printer: PrinterResponse): string {
  if (printer.clientId != null) {
    return String(printer.clientId);
  }
  return "";
}

const VIRTUAL_DISTRIBUTOR_CLIENT_ID = -999999;

export function PrinterDispositionDialog({
  printer,
  clientOptions,
  clients,
  branches,
  companies,
  distributors,
  catalogLoading,
  reconfigure = false,
  onClose,
  onCompleted,
}: PrinterDispositionDialogProps) {
  const { user } = useAuth();
  const toast = useToast();
  const titleId = useId();
  const usbWifi = useUsbWifiConfig();
  const [issuedAt] = useState(() => new Date());
  const [step, setStep] = useState<DispositionWizardStep>(() =>
    resolveDispositionInitialStep(printer, reconfigure),
  );
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [clientOverride, setClientOverride] = useState<string | null>(null);
  const [clientQuery, setClientQuery] = useState("");
  const [facturaNro, setFacturaNro] = useState("");

  const [hydratedPrinterState, setHydratedPrinterState] = useState<{
    printerId: number;
    printer: PrinterResponse | null;
  } | null>(null);

  const needsPrinterHydration =
    (reconfigure || printer.hasTicketConfig === true) &&
    printer.header == null &&
    printer.trailer == null;

  const hydratingPrinter =
    needsPrinterHydration && hydratedPrinterState?.printerId !== printer.id;

  useEffect(() => {
    if (!needsPrinterHydration) return;
    let cancelled = false;
    void fetchPrinterById(printer.id)
      .then((fullPrinter) => {
        if (!cancelled) {
          setHydratedPrinterState({
            printerId: printer.id,
            printer: fullPrinter,
          });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setHydratedPrinterState({
            printerId: printer.id,
            printer: null,
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [needsPrinterHydration, printer.id]);

  const effectivePrinter =
    hydratedPrinterState?.printerId === printer.id &&
    hydratedPrinterState.printer != null
      ? hydratedPrinterState.printer
      : printer;

  const defaultClientId = useMemo(
    () => resolveDefaultClientId(effectivePrinter),
    [effectivePrinter],
  );
  const clientId = clientOverride ?? defaultClientId;
  const disabled = catalogLoading;

  const effectiveDistributorId = useMemo(() => {
    if (effectivePrinter.distributorId != null) {
      return effectivePrinter.distributorId;
    }
    if (user?.role === "DISTRIBUTOR" && user.distributorId != null) {
      return user.distributorId;
    }
    return null;
  }, [effectivePrinter.distributorId, user]);

  const printerDistributor = useMemo(() => {
    if (effectiveDistributorId == null) return undefined;
    return distributors.find((d) => d.id === effectiveDistributorId);
  }, [effectiveDistributorId, distributors]);

  const distributorBranch = useMemo(() => {
    if (!printerDistributor) return undefined;
    return branches.find((b) => b.id === printerDistributor.branchId);
  }, [printerDistributor, branches]);

  const distributorCompany = useMemo(() => {
    if (!distributorBranch) return undefined;
    return companies.find((c) => c.id === distributorBranch.companyId);
  }, [distributorBranch, companies]);

  const existingDistributorClient = useMemo(() => {
    if (!printerDistributor) return undefined;
    const direct = clients.find(
      (c) => c.branchId === printerDistributor.branchId,
    );
    if (direct) return direct;
    if (distributorCompany) {
      return clients.find((c) => {
        const b = branches.find((branch) => branch.id === c.branchId);
        return b && b.companyId === distributorCompany.id;
      });
    }
    return undefined;
  }, [printerDistributor, distributorCompany, clients, branches]);

  const virtualDistributorClient = useMemo<ClientResponse | undefined>(() => {
    if (existingDistributorClient || !printerDistributor || !distributorBranch) {
      return undefined;
    }
    return {
      id: VIRTUAL_DISTRIBUTOR_CLIENT_ID,
      branchId: distributorBranch.id,
      distributorId: printerDistributor.id,
      createdAt: new Date().toISOString(),
      reviewStatus: "ACTIVE",
      companyBusinessName: distributorCompany?.businessName,
      companyRif: distributorCompany?.rif,
      branchCity: distributorBranch.city,
      branchState: distributorBranch.state,
    };
  }, [
    existingDistributorClient,
    printerDistributor,
    distributorBranch,
    distributorCompany,
  ]);

  const [distributorClientState, setDistributorClientState] = useState<
    ClientResponse | undefined
  >(existingDistributorClient);
  const [creatingDistributorClient, setCreatingDistributorClient] =
    useState(false);

  const resolvedDistributorClient =
    distributorClientState ??
    existingDistributorClient ??
    virtualDistributorClient;

  const mergedClients = useMemo(() => {
    if (!resolvedDistributorClient) return clients;
    if (clients.some((c) => c.id === resolvedDistributorClient.id)) {
      return clients;
    }
    return [resolvedDistributorClient, ...clients];
  }, [clients, resolvedDistributorClient]);

  const mergedClientOptions = useMemo<SelectOption[]>(() => {
    let opts = clientOptions;
    if (resolvedDistributorClient) {
      const existing = opts.find(
        (opt) => opt.id === resolvedDistributorClient.id,
      );
      const companyName =
        distributorCompany?.businessName ??
        (distributorBranch
          ? [distributorBranch.city, distributorBranch.state]
              .filter(Boolean)
              .join(", ")
          : "Empresa distribuidora");
      const rif =
        distributorCompany?.rif ??
        (resolvedDistributorClient.id > 0
          ? clientRif(resolvedDistributorClient, branches, companies)
          : undefined);

      if (existing) {
        opts = opts.map((opt) =>
          opt.id === resolvedDistributorClient.id
            ? {
                ...opt,
                label: `${opt.label} (Misma empresa distribuidora)`,
                description: opt.description
                  ? `${opt.description} • Misma empresa distribuidora`
                  : "Misma empresa distribuidora propietaria del equipo",
                searchText: `${opt.searchText ?? ""} ${companyName} ${rif ?? ""} distribuidor distribuidora misma empresa`,
              }
            : opt,
        );
      } else {
        const newOpt: SelectOption = {
          id: resolvedDistributorClient.id,
          label: `${companyName} (Misma empresa distribuidora)`,
          rif: rif || undefined,
          description: rif
            ? `RIF: ${rif} • Misma empresa distribuidora`
            : "Misma empresa distribuidora propietaria del equipo",
          searchText: `${companyName} ${rif ?? ""} distribuidor distribuidora misma empresa`,
        };
        opts = [newOpt, ...opts];
      }
    }
    return opts;
  }, [
    clientOptions,
    resolvedDistributorClient,
    distributorCompany,
    distributorBranch,
    branches,
    companies,
  ]);

  const filteredClientOptions = useMemo(() => {
    if (!clientQuery.trim()) return mergedClientOptions;
    return mergedClientOptions.filter((opt) =>
      matchesSearch(
        clientQuery,
        `${opt.id} ${opt.label}`,
        `${opt.searchText ?? ""} ${opt.rif ?? ""} ${opt.description ?? ""}`,
      ),
    );
  }, [mergedClientOptions, clientQuery]);

  const resolvedClientId = useMemo(() => {
    const parsed = Number(clientId);
    if (!Number.isFinite(parsed) || parsed === 0) return null;
    if (
      (parsed === VIRTUAL_DISTRIBUTOR_CLIENT_ID || parsed < 0) &&
      distributorClientState?.id != null
    ) {
      return distributorClientState.id;
    }
    return parsed > 0 ? parsed : null;
  }, [clientId, distributorClientState]);

  const selectedClient = useMemo(
    () => mergedClients.find((c) => c.id === Number(clientId)),
    [mergedClients, clientId],
  );

  const cachedSelectedClientBranch = useMemo(
    () =>
      selectedClient
        ? branches.find((b) => b.id === selectedClient.branchId)
        : undefined,
    [selectedClient, branches],
  );

  const [fetchedBranchState, setFetchedBranchState] = useState<{
    branchId: number;
    branch: BranchResponse;
  } | null>(null);

  useEffect(() => {
    if (!selectedClient || selectedClient.id <= 0) return;
    if (cachedSelectedClientBranch) return;
    const targetBranchId = selectedClient.branchId;
    let cancelled = false;
    void fetchBranchById(targetBranchId)
      .then((branch) => {
        if (!cancelled) {
          setFetchedBranchState({ branchId: targetBranchId, branch });
        }
      })
      .catch(() => {
        // Fallback to client embedded branch fields when branch lookup is unavailable
      });
    return () => {
      cancelled = true;
    };
  }, [selectedClient, cachedSelectedClientBranch]);

  const selectedClientBranch = useMemo(() => {
    if (!selectedClient) return undefined;
    if (cachedSelectedClientBranch) return cachedSelectedClientBranch;
    if (fetchedBranchState?.branchId === selectedClient.branchId) {
      return fetchedBranchState.branch;
    }
    return undefined;
  }, [selectedClient, cachedSelectedClientBranch, fetchedBranchState]);

  const selectedClientRif = useMemo(() => {
    if (!selectedClient) return null;
    const rif = resolveClientCompanyRif(
      selectedClient,
      selectedClientBranch,
      companies,
    );
    return rif === "-" ? null : rif;
  }, [selectedClient, selectedClientBranch, companies]);

  const selectedClientCompanyName = useMemo(() => {
    if (!selectedClient) return null;
    const name = resolveClientCompanyName(
      selectedClient,
      selectedClientBranch,
      companies,
    );
    return name === "-" ? null : name;
  }, [selectedClient, selectedClientBranch, companies]);

  const selectedContributorType = useMemo(() => {
    if (!selectedClient) return "ordinario" as const;
    return resolveClientContributorType(
      selectedClient,
      selectedClientBranch,
      companies,
    );
  }, [selectedClient, selectedClientBranch, companies]);

  const normalizedFacturaForPreview = useMemo(
    () =>
      facturaNro.trim() ? normalizeFacturaNroInput(facturaNro) : undefined,
    [facturaNro],
  );

  const invoiceSeedKey = useMemo(() => {
    if (hydratingPrinter || resolvedClientId == null) return "";
    return JSON.stringify({
      clientId: resolvedClientId,
      branchId: selectedClientBranch?.id ?? null,
      branchAddress:
        selectedClientBranch?.address ?? selectedClient?.branchAddress ?? null,
      branchCity:
        selectedClientBranch?.city ?? selectedClient?.branchCity ?? null,
      branchState:
        selectedClientBranch?.state ?? selectedClient?.branchState ?? null,
      companyRif: selectedClientRif,
      companyName: selectedClientCompanyName,
      contributorType: selectedContributorType,
      printerId: effectivePrinter.id,
      printerClientId: effectivePrinter.clientId,
      header: effectivePrinter.header ?? null,
      trailer: effectivePrinter.trailer ?? null,
    });
  }, [
    hydratingPrinter,
    resolvedClientId,
    selectedClientBranch,
    selectedClient,
    selectedClientRif,
    selectedClientCompanyName,
    selectedContributorType,
    effectivePrinter,
  ]);

  const baseInvoiceData = useMemo(() => {
    if (hydratingPrinter || resolvedClientId == null) {
      return null;
    }
    const built = buildDispositionInvoiceData({
      clientId: resolvedClientId,
      clients: mergedClients,
      branches,
      clientBranch: selectedClientBranch,
      companies,
      distributors,
      printer: effectivePrinter,
      issuedAt,
      facturaNro: normalizedFacturaForPreview,
    });
    if (!built) return null;
    return applyPrinterTicketToDispositionInvoice(
      built,
      effectivePrinter.trailer,
      selectedContributorType,
      effectivePrinter.clientId === resolvedClientId
        ? effectivePrinter.header
        : null,
    );
  }, [
    hydratingPrinter,
    resolvedClientId,
    mergedClients,
    branches,
    selectedClientBranch,
    companies,
    distributors,
    effectivePrinter,
    issuedAt,
    normalizedFacturaForPreview,
    selectedContributorType,
  ]);

  const [draftState, setDraftState] = useState<{
    seedKey: string;
    draft: VenezuelanFiscalInvoiceData;
    baseline: VenezuelanFiscalInvoiceData;
  } | null>(null);
  const [invoiceEditSessionKey, setInvoiceEditSessionKey] = useState(0);

  const effectiveInvoiceDraft = useMemo(() => {
    if (!baseInvoiceData) return null;
    if (draftState && draftState.seedKey === invoiceSeedKey) {
      return {
        ...draftState.draft,
        metadatos: baseInvoiceData.metadatos,
      };
    }
    return baseInvoiceData;
  }, [baseInvoiceData, draftState, invoiceSeedKey]);

  const hasInvoiceChanges = useMemo(() => {
    if (!draftState || draftState.seedKey !== invoiceSeedKey) return false;
    const comparableDraft = {
      ...draftState.draft,
      metadatos: draftState.baseline.metadatos,
    };
    return (
      JSON.stringify(comparableDraft) !== JSON.stringify(draftState.baseline)
    );
  }, [draftState, invoiceSeedKey]);

  function handleInvoiceDraftChange(next: VenezuelanFiscalInvoiceData) {
    if (!baseInvoiceData) return;
    setFieldError(null);
    setDraftState((current) => ({
      seedKey: invoiceSeedKey,
      draft: next,
      baseline:
        current && current.seedKey === invoiceSeedKey
          ? current.baseline
          : baseInvoiceData,
    }));
  }

  function handleRevertInvoice() {
    setDraftState(null);
    setFieldError(null);
    setInvoiceEditSessionKey((current) => current + 1);
  }

  function goToStep(target: DispositionWizardStep) {
    setFieldError(null);
    setStep(target);
  }

  function handleBack() {
    if (saving) return;
    const prevStep = resolveDispositionPreviousStep(step);
    if (prevStep != null) {
      goToStep(prevStep);
      return;
    }
    onClose();
  }

  function validateClientDispositionInvoice(
    targetClientId: number,
    clientList: ClientResponse[],
    targetFacturaNro?: string,
  ): string | null {
    const invoicePreview = buildDispositionInvoiceData({
      clientId: targetClientId,
      clients: clientList,
      branches,
      clientBranch: selectedClientBranch,
      companies,
      distributors,
      printer: effectivePrinter,
      issuedAt,
      facturaNro: targetFacturaNro,
    });
    if (!invoicePreview) {
      return "No se pudo generar la factura para este cliente.";
    }
    const normalizedClienteRif = normalizeRif(invoicePreview.cliente.rifCi);
    if (!RIF_PATTERN.test(normalizedClienteRif)) {
      return `El RIF de la empresa (${invoicePreview.cliente.rifCi}) debe tener 9 dígitos (ej. J-123456789). Corrige el RIF antes de enajenar.`;
    }
    return null;
  }

  function validateInvoiceStep(): {
    clientId: number;
    facturaNro: string;
  } | null {
    let id = Number(clientId);
    if (
      (id === VIRTUAL_DISTRIBUTOR_CLIENT_ID || id < 0) &&
      distributorClientState?.id != null
    ) {
      id = distributorClientState.id;
    }
    if (!Number.isFinite(id) || id <= 0) {
      setFieldError("Selecciona un cliente válido.");
      return null;
    }
    const facturaError = validateFacturaNroInput(facturaNro);
    if (facturaError) {
      setFieldError(facturaError);
      return null;
    }
    const normalizedFacturaNro = normalizeFacturaNroInput(facturaNro);
    const clientListForInvoice =
      distributorClientState?.id === id &&
      !mergedClients.some((c) => c.id === id)
        ? [distributorClientState, ...mergedClients]
        : mergedClients;

    const clientError = validateClientDispositionInvoice(
      id,
      clientListForInvoice,
      normalizedFacturaNro,
    );
    if (clientError) {
      setFieldError(clientError);
      return null;
    }
    return { clientId: id, facturaNro: normalizedFacturaNro };
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (step === 1) {
      let id = Number(clientId);
      if (!Number.isFinite(id) || id === 0) {
        setFieldError("Selecciona un cliente válido.");
        return;
      }

      let createdClientThisSubmit: ClientResponse | undefined;
      if (id === VIRTUAL_DISTRIBUTOR_CLIENT_ID || id < 0) {
        if (!printerDistributor || !distributorBranch) {
          setFieldError("Distribuidora no encontrada.");
          return;
        }
        setCreatingDistributorClient(true);
        try {
          const created = await createClient({
            branchId: distributorBranch.id,
            distributorId: printerDistributor.id,
          });
          createdClientThisSubmit = created;
          setDistributorClientState(created);
          setClientOverride(String(created.id));
          id = created.id;
        } catch {
          setFieldError("No se pudo registrar la distribuidora como cliente.");
          setCreatingDistributorClient(false);
          return;
        } finally {
          setCreatingDistributorClient(false);
        }
      }

      const clientListForInvoice =
        createdClientThisSubmit &&
        !mergedClients.some((c) => c.id === createdClientThisSubmit.id)
          ? [createdClientThisSubmit, ...mergedClients]
          : distributorClientState?.id === id &&
              !mergedClients.some((c) => c.id === id)
            ? [distributorClientState, ...mergedClients]
            : mergedClients;

      const clientError = validateClientDispositionInvoice(
        id,
        clientListForInvoice,
      );
      if (clientError) {
        setFieldError(clientError);
        return;
      }
      setFieldError(null);
      goToStep(2);
      return;
    }

    const validated = validateInvoiceStep();
    if (!validated) {
      return;
    }

    if (step === 2) {
      setFieldError(null);
      goToStep(3);
      return;
    }

    if (step === 3) {
      if (hydratingPrinter) return;
      if (!effectiveInvoiceDraft) {
        setFieldError("No se pudo generar la vista previa del ticket.");
        return;
      }
      try {
        extractEnajenacionTicketFromInvoice(
          effectiveInvoiceDraft,
          selectedContributorType,
        );
      } catch (err) {
        setFieldError(
          err instanceof Error
            ? err.message
            : "Encabezado o pie de ticket no válido.",
        );
        return;
      }
      setFieldError(null);
      goToStep(4);
      return;
    }

    if (!user || !canDisposePrinterRecord(user.role)) {
      setFieldError(CATALOG_MODIFY_FORBIDDEN_MESSAGE);
      toast.error(CATALOG_MODIFY_FORBIDDEN_MESSAGE);
      return;
    }
    if (!isPrinterAssignedToDistributor(effectivePrinter.status)) {
      const msg =
        "Solo se pueden enajenar impresoras asignadas o en consignación autorizada.";
      setFieldError(msg);
      toast.error(msg);
      return;
    }
    if (!isPrinterPaidForDisposition(effectivePrinter)) {
      const msg = getPrinterDispositionBlockedMessage(effectivePrinter);
      setFieldError(msg);
      toast.error(msg);
      return;
    }
    if (!effectiveInvoiceDraft) {
      setFieldError("No se pudo generar la vista previa del ticket.");
      return;
    }

    let ticket: ReturnType<typeof extractEnajenacionTicketFromInvoice>;
    try {
      ticket = extractEnajenacionTicketFromInvoice(
        effectiveInvoiceDraft,
        selectedContributorType,
      );
    } catch (err) {
      setFieldError(
        err instanceof Error
          ? err.message
          : "Encabezado o pie de ticket no válido.",
      );
      return;
    }

    setFieldError(null);
    setSaving(true);
    try {
      await usbWifi.disconnectUsb();
      const updated = await disposePrinter(effectivePrinter.id, {
        clientId: validated.clientId,
        header: ticket.header,
        trailer: ticket.trailer,
      });
      toast.success(
        isPrinterPendingMqttEnajenacion(effectivePrinter)
          ? `Configuración de ticket actualizada para ${effectivePrinter.fiscalSerial}.`
          : `Configuración de ticket guardada para ${effectivePrinter.fiscalSerial}. La impresora puede iniciar el ritual Remoto.`,
        {
          href: printerPath(effectivePrinter.id),
        },
      );
      await onCompleted(updated, distributorClientState);
      onClose();
    } catch (err) {
      const message = getPrintersErrorMessage(err);
      setFieldError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  if (!isPrinterPaidForDisposition(effectivePrinter)) {
    return (
      <PrinterActionDialogShell
        title={printerDispositionModalTitle(effectivePrinter.fiscalSerial)}
        titleId={titleId}
        printer={effectivePrinter}
        showPrinterSerialSubtitle={false}
        saving={false}
        error={getPrinterDispositionBlockedMessage(effectivePrinter)}
        onClose={onClose}
        submitLabel="Continuar"
        onSubmit={(e) => {
          e.preventDefault();
        }}
        submitDisabled
      >
        <p className="text-sm text-muted">
          Registra el pago de la impresora antes de iniciar la enajenación.
        </p>
      </PrinterActionDialogShell>
    );
  }

  const usbActionRunning =
    usbWifi.usbBusy || usbWifi.wifiScanning || usbWifi.wifiConnecting;
  const wifiTouched =
    usbWifi.usbConnected ||
    usbWifi.wifiMessage != null ||
    usbWifi.wifiConnection.connected === true;
  const isReconfiguringTicket =
    reconfigure || isPrinterPendingMqttEnajenacion(effectivePrinter);

  return (
    <PrinterActionDialogShell
      title={printerDispositionModalTitle(effectivePrinter.fiscalSerial)}
      titleId={titleId}
      printer={effectivePrinter}
      showPrinterSerialSubtitle={false}
      saving={saving}
      error={null}
      onClose={() => {
        if (!saving) onClose();
      }}
      submitLabel={resolveDispositionSubmitLabel({
        step,
        isReconfiguringTicket,
        wifiTouched,
      })}
      onSubmit={(e) => void handleSubmit(e)}
      submitDisabled={
        disabled ||
        saving ||
        creatingDistributorClient ||
        usbActionRunning ||
        (step === 1
          ? !clientId || mergedClientOptions.length === 0
          : step === 2
            ? !facturaNro.trim()
            : step === 3
              ? hydratingPrinter || !effectiveInvoiceDraft
              : false)
      }
      submitLoading={creatingDistributorClient || saving}
      size="xl"
      cancelLabel={step === 1 ? "Cancelar" : "Atrás"}
      onCancel={handleBack}
    >
      <p className="mb-4 shrink-0 text-sm text-muted">
        {resolveDispositionStepSubtitle(step, reconfigure)}
      </p>

      <nav
        className="mb-4 flex shrink-0 gap-1"
        aria-label="Pasos de enajenación"
      >
        {DISPOSITION_WIZARD_STEPS.map(({ step: s, label }) => {
          const Icon = STEP_ICONS[s];
          const isActive = step === s;
          const isDone = step > s;
          return (
            <button
              key={s}
              type="button"
              disabled={disabled || saving || usbActionRunning || s > step}
              onClick={() => {
                if (s < step) goToStep(s);
              }}
              className={cn(
                "flex min-w-0 flex-1 flex-col items-center gap-1 rounded-lg px-2 py-2 text-center transition-colors",
                "hover:bg-foreground/5 disabled:cursor-default disabled:opacity-50",
                isActive && "bg-accent/10 text-accent",
                isDone && !isActive && "text-card-foreground",
                !isActive && !isDone && "text-muted",
              )}
              aria-current={isActive ? "step" : undefined}
            >
              <Icon className="size-4 shrink-0" aria-hidden />
              <span className="text-[11px] font-medium leading-tight sm:text-xs">
                {label}
              </span>
            </button>
          );
        })}
      </nav>

      {step === 1 ? (
        <PrinterActionPickerPanel
          label="Cliente"
          searchPlaceholder="Buscar cliente por nombre, ID o RIF…"
          query={clientQuery}
          onQueryChange={setClientQuery}
          options={filteredClientOptions}
          selectedValue={clientId}
          onSelect={(value) => {
            setClientOverride(value);
            setFieldError(null);
          }}
          loading={catalogLoading}
          disabled={disabled}
          emptyMessage="Sin clientes disponibles"
          noResultsMessage="Sin resultados"
        />
      ) : step === 2 ? (
        <div
          className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-0.5"
          style={{ touchAction: "pan-y" }}
        >
          {selectedClientRif || selectedClientCompanyName ? (
            <div className="space-y-3">
              <div className="rounded-lg border border-border bg-foreground/[0.02] px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted">
                  RIF
                </p>
                <p className="mt-1 truncate font-mono text-sm text-foreground">
                  {selectedClientRif ?? "—"}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-foreground/[0.02] px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted">
                  Empresa
                </p>
                <p className="mt-1 text-sm font-medium text-foreground">
                  {selectedClientCompanyName ?? "—"}
                </p>
              </div>
            </div>
          ) : null}
          <div className="space-y-2">
            <label
              htmlFor={`${titleId}-factura-nro`}
              className="block text-sm font-medium text-foreground"
            >
              Número de factura comercial
            </label>
            <input
              id={`${titleId}-factura-nro`}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              autoFocus
              value={facturaNro}
              onChange={(e) => {
                setFacturaNro(e.target.value);
                setFieldError(null);
              }}
              disabled={disabled}
              className={cn(
                formFieldInputClass,
                "tabular-nums disabled:opacity-50",
              )}
              placeholder="Ej. 00012345"
            />
            <p className="text-xs text-muted">
              Solo para previsualización del ticket de entrega; no afecta el
              correlativo fiscal de la impresora.
            </p>
          </div>
        </div>
      ) : step === 3 ? (
        <div
          className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-0.5"
          style={{ touchAction: "pan-y" }}
        >
          {hydratingPrinter ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Cargando configuración de ticket…
            </div>
          ) : effectiveInvoiceDraft ? (
            <>
              <div className="rounded-lg border border-border/60 bg-muted/30 px-3.5 py-2.5 text-xs text-muted">
                <p>
                  <strong className="text-foreground">
                    Nota sobre la previsualización:
                  </strong>{" "}
                  El número de factura y datos mostrados en este ticket son
                  exclusivamente referenciales para revisar el encabezado y pie
                  de página de la enajenación. No modifican el correlativo
                  fiscal de la impresora.
                </p>
              </div>
              <div className="overflow-x-auto pb-1">
                <VenezuelanFiscalInvoicePreview
                  key={invoiceEditSessionKey}
                  data={effectiveInvoiceDraft}
                  editable
                  hasChanges={hasInvoiceChanges}
                  onChange={handleInvoiceDraftChange}
                  onRevert={handleRevertInvoice}
                />
              </div>
            </>
          ) : (
            <p className="py-8 text-center text-sm text-muted">
              No se pudo generar la vista previa del ticket para este cliente.
            </p>
          )}
        </div>
      ) : (
        <PrinterUsbWifiStep usbWifi={usbWifi} disabled={disabled || saving} />
      )}

      {fieldError ? (
        <p
          role="alert"
          className="mt-2 shrink-0 text-sm text-rose-600 dark:text-rose-400"
        >
          {fieldError}
        </p>
      ) : null}
    </PrinterActionDialogShell>
  );
}
