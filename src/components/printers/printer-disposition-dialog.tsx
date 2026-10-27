"use client";

import { FormEvent, useId, useMemo, useState } from "react";
import { FileText, User } from "lucide-react";
import { useAuth } from "@/context/auth-provider";
import type { SelectOption } from "@/components/printers/printer-form-dialog";
import { PrinterActionDialogShell } from "@/components/printers/printer-action-dialog-shell";
import { PrinterActionPickerPanel } from "@/components/printers/printer-action-picker-panel";
import { printerDispositionModalTitle, PRINTER_UNPAID_DISPOSITION_MESSAGE } from "@/lib/printer-form";
import {
  buildDispositionInvoiceData,
  resolveClientCompanyName,
  resolveClientCompanyRif,
  validateFacturaNroInput,
} from "@/lib/venezuelan-fiscal-invoice";
import {
  clientLabel,
  clientRif,
  clientSearchText,
} from "@/lib/branch-roles";
import { createClient } from "@/lib/clients-api";
import { formFieldInputClass } from "@/lib/toggle-button-styles";
import { matchesSearch } from "@/components/ui/searchable-select";
import { cn } from "@/lib/utils";
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
  onContinue: (payload: { clientId: number; facturaNro: string }) => void;
};

type WizardStep = 1 | 2;

const FORM_STEPS: { step: WizardStep; label: string }[] = [
  { step: 1, label: "Cliente" },
  { step: 2, label: "Factura" },
];

const STEP_ICONS = {
  1: User,
  2: FileText,
} as const;

function resolveDefaultClientId(printer: PrinterResponse): string {
  if (printer.clientId != null) {
    return String(printer.clientId);
  }
  return "";
}

function stepSubtitle(step: WizardStep, reconfigure: boolean): string {
  switch (step) {
    case 1:
      return reconfigure
        ? "Confirma el cliente antes de editar el ticket fiscal."
        : "Selecciona el cliente que recibirá la impresora.";
    case 2:
      return reconfigure
        ? "Confirma o actualiza el número de factura y continúa a la edición del ticket."
        : "Ingresa el número de factura fiscal de la enajenación.";
    default:
      return "";
  }
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
  onContinue,
}: PrinterDispositionDialogProps) {
  const { user } = useAuth();
  const titleId = useId();
  const [step, setStep] = useState<WizardStep>(() =>
    reconfigure && printer.clientId != null ? 2 : 1,
  );
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [clientOverride, setClientOverride] = useState<string | null>(null);
  const [clientQuery, setClientQuery] = useState("");
  const [facturaNro, setFacturaNro] = useState("");
  const defaultClientId = useMemo(
    () => resolveDefaultClientId(printer),
    [printer],
  );
  const clientId = clientOverride ?? defaultClientId;
  const disabled = catalogLoading;

  const effectiveDistributorId = useMemo(() => {
    if (printer.distributorId != null) return printer.distributorId;
    if (user?.role === "DISTRIBUTOR" && user.distributorId != null) {
      return user.distributorId;
    }
    return null;
  }, [printer.distributorId, user]);

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

  const selectedClient = useMemo(
    () => mergedClients.find((c) => c.id === Number(clientId)),
    [mergedClients, clientId],
  );

  const selectedClientBranch = useMemo(
    () =>
      selectedClient
        ? branches.find((b) => b.id === selectedClient.branchId)
        : undefined,
    [selectedClient, branches],
  );

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

  const isDistributorClientSelected =
    resolvedDistributorClient != null &&
    clientId === String(resolvedDistributorClient.id);

  async function handleSelectDistributorClient() {
    setFieldError(null);
    if (
      resolvedDistributorClient?.id != null &&
      resolvedDistributorClient.id > 0
    ) {
      setClientOverride(String(resolvedDistributorClient.id));
      return;
    }
    if (!printerDistributor || !distributorBranch) return;
    setCreatingDistributorClient(true);
    try {
      const created = await createClient({
        branchId: distributorBranch.id,
        distributorId: printerDistributor.id,
      });
      setDistributorClientState(created);
      setClientOverride(String(created.id));
    } catch {
      setFieldError("No se pudo registrar la distribuidora como cliente.");
    } finally {
      setCreatingDistributorClient(false);
    }
  }

  function goToStep(target: WizardStep) {
    setFieldError(null);
    setStep(target);
  }

  function handleBack() {
    if (step === 2) {
      goToStep(1);
      return;
    }
    onClose();
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (step === 1) {
      let id = Number(clientId);
      if (!Number.isFinite(id) || id === 0) {
        setFieldError("Selecciona un cliente válido.");
        return;
      }

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
        distributorClientState?.id === id &&
        !mergedClients.some((c) => c.id === id)
          ? [distributorClientState, ...mergedClients]
          : mergedClients;

      if (
        !buildDispositionInvoiceData({
          clientId: id,
          clients: clientListForInvoice,
          branches,
          companies,
          distributors,
          printer,
        })
      ) {
        setFieldError("No se pudo generar la factura para este cliente.");
        return;
      }
      setFieldError(null);
      goToStep(2);
      return;
    }

    let id = Number(clientId);
    if (
      (id === VIRTUAL_DISTRIBUTOR_CLIENT_ID || id < 0) &&
      distributorClientState?.id != null
    ) {
      id = distributorClientState.id;
    }
    const facturaError = validateFacturaNroInput(facturaNro);
    if (facturaError) {
      setFieldError(facturaError);
      return;
    }
    const normalizedFacturaNro = facturaNro.trim();
    const clientListForInvoice =
      distributorClientState?.id === id &&
      !mergedClients.some((c) => c.id === id)
        ? [distributorClientState, ...mergedClients]
        : mergedClients;

    if (
      !buildDispositionInvoiceData({
        clientId: id,
        clients: clientListForInvoice,
        branches,
        companies,
        distributors,
        printer,
        facturaNro: normalizedFacturaNro,
      })
    ) {
      setFieldError("No se pudo generar la factura para este cliente.");
      return;
    }
    setFieldError(null);
    onContinue({ clientId: id, facturaNro: normalizedFacturaNro });
  }

  if (!printer.paid) {
    return (
      <PrinterActionDialogShell
        title={printerDispositionModalTitle(printer.fiscalSerial)}
        titleId={titleId}
        printer={printer}
        showPrinterSerialSubtitle={false}
        saving={false}
        error={PRINTER_UNPAID_DISPOSITION_MESSAGE}
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

  return (
    <PrinterActionDialogShell
      title={printerDispositionModalTitle(printer.fiscalSerial)}
      titleId={titleId}
      printer={printer}
      showPrinterSerialSubtitle={false}
      saving={false}
      error={null}
      onClose={onClose}
      submitLabel={step === 1 ? "Siguiente" : "Continuar"}
      onSubmit={handleSubmit}
      submitDisabled={
        disabled ||
        (step === 1
          ? !clientId || clientOptions.length === 0
          : !facturaNro.trim())
      }
      submitLoading={false}
      size="lg"
      cancelLabel={step === 1 ? "Cancelar" : "Atrás"}
      onCancel={handleBack}
    >
      <p className="mb-4 text-sm text-muted">{stepSubtitle(step, reconfigure)}</p>

      <nav
        className="mb-4 flex gap-1"
        aria-label="Pasos de enajenación"
      >
        {FORM_STEPS.map(({ step: s, label }) => {
          const Icon = STEP_ICONS[s];
          const isActive = step === s;
          const isDone = step > s;
          return (
            <button
              key={s}
              type="button"
              disabled={disabled || (s === 2 && step === 1)}
              onClick={() => {
                if (s === 1 && step === 2) goToStep(1);
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
        <div className="space-y-4">
          {printerDistributor && distributorBranch ? (
            <div className="rounded-xl border border-border bg-foreground/[0.02] p-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <span className="inline-flex items-center gap-1 rounded bg-accent/10 px-2 py-0.5 text-[11px] font-semibold text-accent">
                    Misma empresa distribuidora
                  </span>
                  <p className="mt-1 truncate font-medium text-foreground">
                    {distributorCompany?.businessName ?? "Empresa distribuidora"}
                  </p>
                  <p className="truncate text-xs text-muted">
                    {distributorCompany?.rif
                      ? `RIF: ${distributorCompany.rif}`
                      : ""}
                    {[distributorBranch.city, distributorBranch.state]
                      .filter(Boolean)
                      .join(", ")
                      ? `${distributorCompany?.rif ? " • " : ""}${[distributorBranch.city, distributorBranch.state].filter(Boolean).join(", ")}`
                      : ""}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={disabled || creatingDistributorClient}
                  onClick={() => void handleSelectDistributorClient()}
                  className={cn(
                    "shrink-0 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                    isDistributorClientSelected
                      ? "border-accent bg-accent text-white dark:text-black"
                      : "border-border bg-card text-foreground hover:bg-foreground/5",
                  )}
                >
                  {creatingDistributorClient
                    ? "Registrando…"
                    : isDistributorClientSelected
                      ? "Seleccionada ✓"
                      : "Escoger como cliente"}
                </button>
              </div>
            </div>
          ) : null}

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
        </div>
      ) : (
        <div className="space-y-4">
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
              Número de factura
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
              className={cn(formFieldInputClass, "tabular-nums disabled:opacity-50")}
              placeholder="Ej. 00012345"
            />
          </div>
        </div>
      )}

      {fieldError ? (
        <p className="mt-2 text-sm text-rose-600 dark:text-rose-400">
          {fieldError}
        </p>
      ) : null}
    </PrinterActionDialogShell>
  );
}
