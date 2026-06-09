"use client";

import { FormEvent, useId, useMemo, useState } from "react";
import type { SelectOption } from "@/components/printers/printer-form-dialog";
import { PrinterActionDialogShell } from "@/components/printers/printer-action-dialog-shell";
import { PrinterActionPickerPanel } from "@/components/printers/printer-action-picker-panel";
import { buildDispositionInvoiceData } from "@/lib/venezuelan-fiscal-invoice";
import type { BranchResponse } from "@/types/branch";
import type { ClientResponse } from "@/types/branch-role";
import type { CompanyResponse } from "@/types/company";
import type { PrinterResponse } from "@/types/printer";

type PrinterDispositionDialogProps = {
  printer: PrinterResponse;
  clientOptions: SelectOption[];
  clients: ClientResponse[];
  branches: BranchResponse[];
  companies: CompanyResponse[];
  catalogLoading: boolean;
  onClose: () => void;
  onContinue: (clientId: number) => void;
};

function resolveDefaultClientId(printer: PrinterResponse): string {
  if (printer.clientId != null) {
    return String(printer.clientId);
  }
  return "";
}

export function PrinterDispositionDialog({
  printer,
  clientOptions,
  clients,
  branches,
  companies,
  catalogLoading,
  onClose,
  onContinue,
}: PrinterDispositionDialogProps) {
  const titleId = useId();
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [clientOverride, setClientOverride] = useState<string | null>(null);
  const [clientQuery, setClientQuery] = useState("");
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

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
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
        printer,
      })
    ) {
      setFieldError("No se pudo generar la factura para este cliente.");
      return;
    }
    setFieldError(null);
    onContinue(id);
  }

  return (
    <PrinterActionDialogShell
      title="Enajenar impresora"
      titleId={titleId}
      printer={printer}
      saving={false}
      error={null}
      onClose={onClose}
      submitLabel="Continuar"
      onSubmit={handleSubmit}
      submitDisabled={disabled || !clientId || clientOptions.length === 0}
      submitLoading={false}
      size="md"
      cancelLabel="Cancelar"
    >
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
    </PrinterActionDialogShell>
  );
}
