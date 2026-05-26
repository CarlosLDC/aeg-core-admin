"use client";

import { FormEvent, useId, useMemo, useState } from "react";
import { Loader2, X } from "lucide-react";
import type { SelectOption } from "@/components/printers/printer-form-dialog";
import { FieldLabel } from "@/components/ui/field-label";
import {
  SearchableSelect,
  type SearchableSelectOption,
} from "@/components/ui/searchable-select";
import type { PrinterResponse } from "@/types/printer";
import { cn } from "@/lib/utils";

type PrinterDispositionDialogProps = {
  printer: PrinterResponse;
  saving: boolean;
  error: string | null;
  clientOptions: SelectOption[];
  catalogLoading: boolean;
  onClose: () => void;
  onSubmit: (clientId: number) => void;
};

function toSearchableOptions(options: SelectOption[]): SearchableSelectOption[] {
  return options.map((opt) => ({
    value: String(opt.id),
    label: opt.label,
    searchText: String(opt.id),
  }));
}

function resolveDefaultClientId(
  printer: PrinterResponse,
  clientOptions: SelectOption[],
): string {
  if (printer.clientId != null) {
    return String(printer.clientId);
  }
  if (clientOptions.length > 0) {
    return String(clientOptions[0].id);
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
  const titleId = useId();
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [clientOverride, setClientOverride] = useState<string | null>(null);

  const clientSearchOptions = useMemo(
    () => toSearchableOptions(clientOptions),
    [clientOptions],
  );
  const defaultClientId = useMemo(
    () => resolveDefaultClientId(printer, clientOptions),
    [printer, clientOptions],
  );
  const clientId = clientOverride ?? defaultClientId;
  const disabled = saving || catalogLoading;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const id = Number(clientId);
    if (!Number.isFinite(id) || id <= 0) {
      setFieldError("Selecciona un cliente válido.");
      return;
    }
    setFieldError(null);
    onSubmit(id);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="Cerrar"
        disabled={saving}
        onClick={onClose}
      />
      <div className="relative flex max-h-[min(92vh,100dvh)] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-border bg-card shadow-xl">
        <div className="shrink-0 border-b border-border px-4 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2
                id={titleId}
                className="text-lg font-semibold text-card-foreground"
              >
                Enajenar impresora
              </h2>
              <p className="mt-1 text-sm text-muted">
                Serial{" "}
                <span className="font-mono text-card-foreground">
                  {printer.fiscalSerial}
                </span>
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-md p-1 text-muted hover:bg-foreground/5 disabled:opacity-50"
              aria-label="Cerrar"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
            <p className="text-sm text-muted">
              La impresora pasará de{" "}
              <strong className="text-card-foreground">Asignada</strong> a{" "}
              <strong className="text-card-foreground">Enajenada</strong> al
              confirmar.
            </p>

            <div className="mt-4">
              <FieldLabel>Cliente</FieldLabel>
              <SearchableSelect
                value={clientId}
                onChange={setClientOverride}
                options={clientSearchOptions}
                disabled={disabled}
                loading={catalogLoading}
                emptyLabel={
                  clientOptions.length === 0
                    ? "Sin clientes disponibles"
                    : "Seleccionar cliente"
                }
                searchPlaceholder="Buscar cliente..."
                modalTitle="Cliente"
                required
              />
              {fieldError ? (
                <p className="mt-1 text-sm text-rose-600 dark:text-rose-400">
                  {fieldError}
                </p>
              ) : null}
            </div>

            {error ? (
              <p
                role="alert"
                className="mt-4 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-300"
              >
                {error}
              </p>
            ) : null}
          </div>

          <div className="shrink-0 border-t border-border px-4 py-4 sm:px-6">
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end [&_button]:w-full sm:[&_button]:w-auto">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="rounded-lg px-4 py-2 text-sm font-medium text-muted hover:bg-foreground/5 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={disabled || !clientId || clientOptions.length === 0}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground",
                  (disabled || !clientId || clientOptions.length === 0) &&
                    "cursor-not-allowed opacity-70",
                )}
              >
                {saving && <Loader2 className="size-4 animate-spin" />}
                Enajenar impresora
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
