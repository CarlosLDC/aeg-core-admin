"use client";

import { FormEvent, useId, useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, Loader2, X } from "lucide-react";
import type { SelectOption } from "@/components/printers/printer-form-dialog";
import { PrinterStatusBadge } from "@/components/printers/printer-status-badge";
import { FieldLabel } from "@/components/ui/field-label";
import {
  SearchableSelect,
  type SearchableSelectOption,
} from "@/components/ui/searchable-select";
import type { PrinterResponse } from "@/types/printer";
import { cn } from "@/lib/utils";

type PrinterAssignmentDialogProps = {
  printer: PrinterResponse;
  saving: boolean;
  error: string | null;
  distributorOptions: SelectOption[];
  catalogLoading: boolean;
  lockDistributor: boolean;
  defaultDistributorId?: number | null;
  onClose: () => void;
  onSubmit: (distributorId: number) => void;
};

function resolveDefaultDistributorId(
  printer: PrinterResponse,
  distributorOptions: SelectOption[],
  lockDistributor: boolean,
  defaultDistributorId: number | null | undefined,
): string {
  if (lockDistributor && defaultDistributorId != null) {
    return String(defaultDistributorId);
  }
  if (!lockDistributor) {
    return "";
  }
  if (printer.distributorId != null) {
    return String(printer.distributorId);
  }
  return "";
}

function toSearchableOptions(options: SelectOption[]): SearchableSelectOption[] {
  return options.map((opt) => ({
    value: String(opt.id),
    label: opt.label,
    searchText: String(opt.id),
  }));
}

export function PrinterAssignmentDialog({
  printer,
  saving,
  error,
  distributorOptions,
  catalogLoading,
  lockDistributor,
  defaultDistributorId,
  onClose,
  onSubmit,
}: PrinterAssignmentDialogProps) {
  const titleId = useId();
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [distributorOverride, setDistributorOverride] = useState<string | null>(
    null,
  );

  const distributorSearchOptions = useMemo(
    () => toSearchableOptions(distributorOptions),
    [distributorOptions],
  );

  const defaultDistributorSelection = useMemo(
    () =>
      resolveDefaultDistributorId(
        printer,
        distributorOptions,
        lockDistributor,
        defaultDistributorId,
      ),
    [printer, distributorOptions, lockDistributor, defaultDistributorId],
  );

  const distributorId = distributorOverride ?? defaultDistributorSelection;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const id = Number(distributorId);
    if (!Number.isFinite(id) || id <= 0) {
      setFieldError("Selecciona una distribuidora válida.");
      return;
    }
    setFieldError(null);
    onSubmit(id);
  }

  const disabled = saving || catalogLoading;

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
                Asignar impresora
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
            <div className="rounded-lg border border-border bg-foreground/[0.02] p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted">
                Cambio de estado
              </p>
              <div className="mt-2 flex items-center gap-2">
                <PrinterStatusBadge status="inicializada" />
                <ArrowRight className="size-4 text-muted" />
                <PrinterStatusBadge status="asignada" />
              </div>
            </div>

            <div className="mt-4">
              <FieldLabel>Distribuidora</FieldLabel>
              <SearchableSelect
                value={distributorId}
                onChange={setDistributorOverride}
                options={distributorSearchOptions}
                disabled={disabled || lockDistributor}
                loading={catalogLoading}
                emptyLabel={
                  distributorOptions.length === 0
                    ? "Sin distribuidoras disponibles"
                    : "Seleccionar distribuidora"
                }
                searchPlaceholder="Buscar distribuidora…"
                modalTitle="Distribuidora"
                required
              />
              {fieldError ? (
                <p className="mt-1 text-sm text-rose-600 dark:text-rose-400">
                  {fieldError}
                </p>
              ) : null}
            </div>

            <div
              role="alert"
              className="mt-4 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-200"
            >
              <p className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <span>
                  Esta es una acción importante: al confirmar, la impresora quedará
                  en estado <strong>Asignada</strong>.
                </span>
              </p>
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
                disabled={
                  disabled ||
                  !distributorId ||
                  distributorOptions.length === 0
                }
                className={cn(
                  "flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground",
                  (disabled ||
                    !distributorId ||
                    distributorOptions.length === 0) &&
                    "cursor-not-allowed opacity-70",
                )}
              >
                {saving && <Loader2 className="size-4 animate-spin" />}
                Asignar impresora
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
