"use client";

import { FormEvent, useId, useMemo, useState } from "react";
import type { SelectOption } from "@/components/printers/printer-form-dialog";
import { PrinterActionDialogShell } from "@/components/printers/printer-action-dialog-shell";
import { PrinterActionPickerPanel } from "@/components/printers/printer-action-picker-panel";
import { PrinterStatusTransition } from "@/components/printers/printer-status-transition";
import { VenezuelanFiscalInvoicePreview } from "@/components/printers/venezuelan-fiscal-invoice-preview";
import { buildDispositionInvoiceData } from "@/lib/venezuelan-fiscal-invoice";
import type { BranchResponse } from "@/types/branch";
import type { ClientResponse } from "@/types/branch-role";
import type { CompanyResponse } from "@/types/company";
import type { PrinterResponse } from "@/types/printer";

type DispositionStep = "client" | "invoice";

type PrinterDispositionDialogProps = {
  printer: PrinterResponse;
  saving: boolean;
  error: string | null;
  clientOptions: SelectOption[];
  clients: ClientResponse[];
  branches: BranchResponse[];
  companies: CompanyResponse[];
  catalogLoading: boolean;
  onClose: () => void;
  onSubmit: (clientId: number) => void;
};

function resolveDefaultClientId(
  printer: PrinterResponse,
  clientOptions: SelectOption[],
): string {
  if (printer.clientId != null) {
    return String(printer.clientId);
  }
  return "";
}

export function PrinterDispositionDialog({
  printer,
  saving,
  error,
  clientOptions,
  clients,
  branches,
  companies,
  catalogLoading,
  onClose,
  onSubmit,
}: PrinterDispositionDialogProps) {
  const titleId = useId();
  const [step, setStep] = useState<DispositionStep>("client");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [clientOverride, setClientOverride] = useState<string | null>(null);
  const [clientQuery, setClientQuery] = useState("");
  const defaultClientId = useMemo(
    () => resolveDefaultClientId(printer, clientOptions),
    [printer, clientOptions],
  );
  const clientId = clientOverride ?? defaultClientId;
  const disabled = saving || catalogLoading;

  const filteredClientOptions = useMemo(() => {
    const q = clientQuery.trim().toLowerCase();
    if (!q) return clientOptions;
    return clientOptions.filter((opt) =>
      `${opt.id} ${opt.label}`.toLowerCase().includes(q),
    );
  }, [clientOptions, clientQuery]);

  const invoiceData = useMemo(() => {
    const id = Number(clientId);
    if (!Number.isFinite(id) || id <= 0) return null;
    return buildDispositionInvoiceData({
      clientId: id,
      clients,
      branches,
      companies,
      printer,
    });
  }, [clientId, clients, branches, companies, printer]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (step === "client") {
      const id = Number(clientId);
      if (!Number.isFinite(id) || id <= 0) {
        setFieldError("Selecciona un cliente válido.");
        return;
      }
      if (!buildDispositionInvoiceData({
        clientId: id,
        clients,
        branches,
        companies,
        printer,
      })) {
        setFieldError("No se pudo generar la factura para este cliente.");
        return;
      }
      setFieldError(null);
      setStep("invoice");
      return;
    }

    const id = Number(clientId);
    if (!Number.isFinite(id) || id <= 0) return;
    onSubmit(id);
  }

  return (
    <PrinterActionDialogShell
      title={step === "client" ? "Enajenar impresora" : "Factura virtual"}
      titleId={titleId}
      printer={printer}
      saving={saving}
      error={error}
      onClose={onClose}
      submitLabel={
        step === "client" ? "Continuar" : "Confirmar enajenación"
      }
      onSubmit={handleSubmit}
      submitDisabled={
        disabled ||
        (step === "client"
          ? !clientId || clientOptions.length === 0
          : !invoiceData)
      }
      submitLoading={saving}
      size={step === "invoice" ? "receipt" : "md"}
      cancelLabel={step === "client" ? "Cancelar" : "Volver"}
      onCancel={step === "invoice" ? () => setStep("client") : undefined}
      submitDestructive={step === "invoice"}
    >
      {step === "client" ? (
        <>
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
          {fieldError ? (
            <p className="mt-2 text-sm text-rose-600 dark:text-rose-400">
              {fieldError}
            </p>
          ) : null}
        </>
      ) : invoiceData ? (
        <div className="flex min-h-0 flex-1 flex-col items-center gap-4 overflow-y-auto">
          <p className="text-center text-sm text-muted">
            Revisa la factura fiscal antes de confirmar la enajenación.
          </p>
          <VenezuelanFiscalInvoicePreview data={invoiceData} />
          <PrinterStatusTransition from="asignada" to="enajenada" />
        </div>
      ) : null}
    </PrinterActionDialogShell>
  );
}
