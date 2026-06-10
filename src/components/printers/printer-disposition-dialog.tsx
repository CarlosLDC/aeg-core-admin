"use client";

import { FormEvent, useId, useMemo, useState } from "react";
import { FileText, User } from "lucide-react";
import type { SelectOption } from "@/components/printers/printer-form-dialog";
import { PrinterActionDialogShell } from "@/components/printers/printer-action-dialog-shell";
import { PrinterActionPickerPanel } from "@/components/printers/printer-action-picker-panel";
import { printerDispositionModalTitle } from "@/lib/printer-form";
import {
  buildDispositionInvoiceData,
  resolveClientCompanyName,
  resolveClientCompanyRif,
  validateFacturaNroInput,
} from "@/lib/venezuelan-fiscal-invoice";
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

function stepSubtitle(step: WizardStep): string {
  switch (step) {
    case 1:
      return "Selecciona el cliente que recibirá la impresora.";
    case 2:
      return "Ingresa el número de factura fiscal de la enajenación.";
    default:
      return "";
  }
}

export function PrinterDispositionDialog({
  printer,
  clientOptions,
  clients,
  branches,
  companies,
  distributors,
  catalogLoading,
  onClose,
  onContinue,
}: PrinterDispositionDialogProps) {
  const titleId = useId();
  const [step, setStep] = useState<WizardStep>(1);
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

  const filteredClientOptions = useMemo(() => {
    const q = clientQuery.trim().toLowerCase();
    if (!q) return clientOptions;
    return clientOptions.filter((opt) =>
      `${opt.id} ${opt.label}`.toLowerCase().includes(q),
    );
  }, [clientOptions, clientQuery]);

  const selectedClient = useMemo(
    () => clients.find((c) => c.id === Number(clientId)),
    [clients, clientId],
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

  function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (step === 1) {
      const id = Number(clientId);
      if (!Number.isFinite(id) || id <= 0) {
        setFieldError("Selecciona un cliente válido.");
        return;
      }
      if (
        !buildDispositionInvoiceData({
          clientId: id,
          clients,
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

    const id = Number(clientId);
    const facturaError = validateFacturaNroInput(facturaNro);
    if (facturaError) {
      setFieldError(facturaError);
      return;
    }
    const normalizedFacturaNro = facturaNro.trim();
    if (
      !buildDispositionInvoiceData({
        clientId: id,
        clients,
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
      <p className="mb-4 text-sm text-muted">{stepSubtitle(step)}</p>

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
        <PrinterActionPickerPanel
          label="Cliente"
          searchPlaceholder="Buscar cliente por nombre o ID…"
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
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm tabular-nums disabled:opacity-50"
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
