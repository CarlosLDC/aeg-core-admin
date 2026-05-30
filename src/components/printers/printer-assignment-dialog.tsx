"use client";

import { FormEvent, useId, useMemo, useState } from "react";
import { Loader2, X } from "lucide-react";
import type { SelectOption } from "@/components/printers/printer-form-dialog";
import { PrinterStatusTransition } from "@/components/printers/printer-status-transition";
import { FieldLabel } from "@/components/ui/field-label";
import {
  SearchableSelect,
  type SearchableSelectOption,
} from "@/components/ui/searchable-select";
import { useConfirm } from "@/context/confirm-provider";
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
  const confirm = useConfirm();
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

  const selectedDistributorLabel = useMemo(() => {
    const id = Number(distributorId);
    if (!Number.isFinite(id) || id <= 0) return null;
    return distributorOptions.find((opt) => opt.id === id)?.label ?? null;
  }, [distributorId, distributorOptions]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const id = Number(distributorId);
    if (!Number.isFinite(id) || id <= 0) {
      setFieldError("Selecciona una distribuidora válida.");
      return;
    }
    setFieldError(null);

    const accepted = await confirm({
      title: "Confirmar asignación",
      content: (
        <>
          <p className="text-sm text-muted">
            Vas a asignar la impresora{" "}
            <span className="font-mono text-card-foreground">
              {printer.fiscalSerial}
            </span>
            {selfAssign ? (
              <> a tu cartera</>
            ) : selectedDistributorLabel ? (
              <>
                {" "}
                a{" "}
                <strong className="text-card-foreground">
                  {selectedDistributorLabel}
                </strong>
              </>
            ) : null}
            . Esta acción actualiza el estado de la impresora.
          </p>
          <PrinterStatusTransition from="sin_asignar" to="asignada" />
        </>
      ),
      confirmLabel: "Asignar impresora",
      destructive: true,
    });
    if (!accepted) return;

    onSubmit(id);
  }

  const disabled = saving || catalogLoading;
  const selfAssign =
    lockDistributor && defaultDistributorId != null && defaultDistributorId > 0;

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
            {selfAssign ? (
              <p className="text-sm text-muted">
                La impresora quedará asignada a tu cartera con estatus{" "}
                <span className="font-medium text-card-foreground">Asignada</span>
                .
              </p>
            ) : (
              <div>
                <FieldLabel>Distribuidora</FieldLabel>
                <SearchableSelect
                  value={distributorId}
                  onChange={setDistributorOverride}
                  options={distributorSearchOptions}
                  disabled={disabled}
                  loading={catalogLoading}
                  emptyLabel={
                    distributorOptions.length === 0
                      ? "Sin distribuidoras disponibles"
                      : "Seleccionar distribuidora"
                  }
                  searchPlaceholder="Buscar distribuidora…"
                  modalTitle="Distribuidora"
                  required
                  openOnMount
                  preloadOptions
                />
                {fieldError ? (
                  <p className="mt-1 text-sm text-rose-600 dark:text-rose-400">
                    {fieldError}
                  </p>
                ) : null}
              </div>
            )}

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
                  (!selfAssign && distributorOptions.length === 0)
                }
                className={cn(
                  "flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground",
                  (disabled ||
                    !distributorId ||
                    (!selfAssign && distributorOptions.length === 0)) &&
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
