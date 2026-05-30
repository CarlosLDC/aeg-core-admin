"use client";

import { FormEvent, useId, useMemo, useState } from "react";
import type { SelectOption } from "@/components/printers/printer-form-dialog";
import { PrinterActionDialogShell } from "@/components/printers/printer-action-dialog-shell";
import { PrinterActionPickerPanel } from "@/components/printers/printer-action-picker-panel";
import { PrinterStatusTransition } from "@/components/printers/printer-status-transition";
import { useConfirm } from "@/context/confirm-provider";
import type { PrinterResponse } from "@/types/printer";

type PrinterDispositionDialogProps = {
  printer: PrinterResponse;
  saving: boolean;
  error: string | null;
  clientOptions: SelectOption[];
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
  catalogLoading,
  onClose,
  onSubmit,
}: PrinterDispositionDialogProps) {
  const confirm = useConfirm();
  const titleId = useId();
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [clientOverride, setClientOverride] = useState<string | null>(null);
  const [clientQuery, setClientQuery] = useState("");
  const defaultClientId = useMemo(
    () => resolveDefaultClientId(printer, clientOptions),
    [printer, clientOptions],
  );
  const clientId = clientOverride ?? defaultClientId;
  const disabled = saving || catalogLoading;

  const selectedClientLabel = useMemo(() => {
    const id = Number(clientId);
    if (!Number.isFinite(id) || id <= 0) return null;
    return clientOptions.find((opt) => opt.id === id)?.label ?? null;
  }, [clientId, clientOptions]);
  const filteredClientOptions = useMemo(() => {
    const q = clientQuery.trim().toLowerCase();
    if (!q) return clientOptions;
    return clientOptions.filter((opt) =>
      `${opt.id} ${opt.label}`.toLowerCase().includes(q),
    );
  }, [clientOptions, clientQuery]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const id = Number(clientId);
    if (!Number.isFinite(id) || id <= 0) {
      setFieldError("Selecciona un cliente válido.");
      return;
    }
    setFieldError(null);

    const accepted = await confirm({
      title: "Confirmar enajenación",
      content: (
        <>
          <p className="text-sm text-muted">
            Vas a enajenar la impresora{" "}
            <span className="font-mono text-card-foreground">
              {printer.fiscalSerial}
            </span>
            {selectedClientLabel ? (
              <>
                {" "}
                al cliente{" "}
                <strong className="text-card-foreground">{selectedClientLabel}</strong>
              </>
            ) : null}
            . Esta acción actualiza el estado de la impresora.
          </p>
          <PrinterStatusTransition from="asignada" to="enajenada" />
        </>
      ),
      confirmLabel: "Enajenar impresora",
      destructive: true,
    });
    if (!accepted) return;

    onSubmit(id);
  }

  return (
    <PrinterActionDialogShell
      title="Enajenar impresora"
      titleId={titleId}
      printer={printer}
      fromStatus="asignada"
      toStatus="enajenada"
      saving={saving}
      error={error}
      onClose={onClose}
      submitLabel="Enajenar impresora"
      onSubmit={handleSubmit}
      submitDisabled={disabled || !clientId || clientOptions.length === 0}
      submitLoading={saving}
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
