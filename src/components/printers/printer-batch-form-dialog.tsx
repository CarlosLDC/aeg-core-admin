"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Loader2, X } from "lucide-react";
import type { SelectOption } from "@/components/printers/printer-form-dialog";
import {
  emptySerialRangeForm,
  SerialRangeFields,
  type SerialRangeFormValues,
} from "@/components/ui/serial-range-fields";
import { BooleanToggle } from "@/components/ui/boolean-toggle";
import {
  SearchableSelect,
  type SearchableSelectOption,
} from "@/components/ui/searchable-select";
import {
  DEVICE_TYPE_LABELS,
  emptyPrinterForm,
  PRINTER_STATUS_LABELS,
  type PrinterFormValues,
} from "@/lib/printer-form";
import { buildSerialRange } from "@/lib/serial-range";
import { DEVICE_TYPES, PRINTER_STATUSES } from "@/types/printer";
import { cn } from "@/lib/utils";

function toSearchableOptions(options: SelectOption[]): SearchableSelectOption[] {
  return options.map((opt) => ({
    value: String(opt.id),
    label: opt.label,
    searchText: String(opt.id),
  }));
}

export type PrinterBatchSubmitPayload = {
  serials: string[];
  base: Omit<PrinterFormValues, "fiscalSerial">;
};

type PrinterBatchFormDialogProps = {
  open: boolean;
  saving: boolean;
  progress: { done: number; total: number } | null;
  error: string | null;
  modelOptions: SelectOption[];
  softwareOptions: SelectOption[];
  clientOptions: SelectOption[];
  distributorOptions: SelectOption[];
  modelsLoading: boolean;
  catalogLoading: boolean;
  canPickSoftware: boolean;
  lockDistributor: boolean;
  defaultDistributorId?: number | null;
  onClose: () => void;
  onSubmit: (payload: PrinterBatchSubmitPayload) => void;
};

export function PrinterBatchFormDialog({
  open,
  saving,
  progress,
  error,
  modelOptions,
  softwareOptions,
  clientOptions,
  distributorOptions,
  modelsLoading,
  catalogLoading,
  canPickSoftware,
  lockDistributor,
  defaultDistributorId,
  onClose,
  onSubmit,
}: PrinterBatchFormDialogProps) {
  const [range, setRange] = useState<SerialRangeFormValues>(emptySerialRangeForm);
  const [form, setForm] = useState<Omit<PrinterFormValues, "fiscalSerial">>(
    emptyPrinterForm(),
  );

  useEffect(() => {
    if (!open) return;
    const distributorDefault =
      defaultDistributorId != null ? String(defaultDistributorId) : "";
    setRange(emptySerialRangeForm());
    setForm(
      emptyPrinterForm({
        distributorId: lockDistributor ? distributorDefault : "",
      }),
    );
  }, [open, lockDistributor, defaultDistributorId]);

  const distributorSearchOptions = useMemo(
    () => toSearchableOptions(distributorOptions),
    [distributorOptions],
  );
  const clientSearchOptions = useMemo(
    () => toSearchableOptions(clientOptions),
    [clientOptions],
  );
  const softwareSearchOptions = useMemo(
    () => toSearchableOptions(softwareOptions),
    [softwareOptions],
  );

  if (!open) return null;

  const inputClass =
    "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-ring/20";
  const disabled = saving || modelsLoading || catalogLoading;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const serials = buildSerialRange(range, { mode: "fiscal" });
    if (typeof serials === "string") return;
    onSubmit({ serials, base: form });
  }

  const busy = saving;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="Cerrar"
        onClick={onClose}
        disabled={busy}
      />
      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-xl">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-card-foreground">
              Crear impresoras por lote
            </h2>
            <p className="mt-1 text-sm text-muted">
              Mismos datos operativos para cada equipo; los seriales fiscales se
              generan del rango indicado.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-lg p-1.5 text-muted hover:bg-foreground/5 disabled:opacity-50"
          >
            <X className="size-5" />
          </button>
        </div>

        {error && (
          <p
            role="alert"
            className="mb-4 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-300"
          >
            {error}
          </p>
        )}

        {progress && progress.total > 0 && (
          <p className="mb-4 flex items-center gap-2 text-sm text-muted">
            <Loader2 className="size-4 shrink-0 animate-spin" />
            Creando {Math.min(progress.done + 1, progress.total)} de{" "}
            {progress.total}…
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <SerialRangeFields
            mode="fiscal"
            values={range}
            onChange={setRange}
            disabled={disabled}
          />

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">
              Modelo fiscal
            </span>
            {modelOptions.length > 0 ? (
              <select
                required
                value={form.modelId}
                disabled={disabled}
                onChange={(e) =>
                  setForm((f) => ({ ...f, modelId: e.target.value }))
                }
                className={inputClass}
              >
                <option value="">Seleccionar modelo…</option>
                {modelOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="number"
                required
                min={1}
                value={form.modelId}
                disabled={disabled}
                onChange={(e) =>
                  setForm((f) => ({ ...f, modelId: e.target.value }))
                }
                className={inputClass}
                placeholder="ID del modelo"
              />
            )}
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">Estatus</span>
              <select
                required
                value={form.status}
                disabled={disabled}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    status: e.target.value as PrinterFormValues["status"],
                  }))
                }
                className={inputClass}
              >
                {PRINTER_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {PRINTER_STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">
                Tipo de dispositivo
              </span>
              <select
                required
                value={form.deviceType}
                disabled={disabled}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    deviceType: e.target.value as PrinterFormValues["deviceType"],
                  }))
                }
                className={inputClass}
              >
                {DEVICE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {DEVICE_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">
                Precio venta final
              </span>
              <input
                type="number"
                min={0}
                step="0.01"
                value={form.finalSalePrice}
                disabled={disabled}
                onChange={(e) =>
                  setForm((f) => ({ ...f, finalSalePrice: e.target.value }))
                }
                className={inputClass}
              />
            </label>
            <div className="block">
              <span className="mb-1.5 block text-sm font-medium">
                Estado de pago
              </span>
              <BooleanToggle
                value={form.paid}
                onChange={(paid) => setForm((f) => ({ ...f, paid }))}
                disabled={disabled}
                falseLabel="Pendiente"
                trueLabel="Pagada"
                ariaLabel="Estado de pago de la impresora"
              />
            </div>
          </div>

          <div className="block">
            <span className="mb-1.5 block text-sm font-medium">Distribuidor</span>
            <SearchableSelect
              value={form.distributorId}
              onChange={(distributorId) =>
                setForm((f) => ({ ...f, distributorId }))
              }
              options={distributorSearchOptions}
              disabled={disabled || lockDistributor}
              loading={catalogLoading}
              emptyLabel="Sin asignar"
              searchPlaceholder="Buscar distribuidor…"
            />
          </div>

          <div className="block">
            <span className="mb-1.5 block text-sm font-medium">Cliente</span>
            <SearchableSelect
              value={form.clientId}
              onChange={(clientId) => setForm((f) => ({ ...f, clientId }))}
              options={clientSearchOptions}
              disabled={disabled}
              loading={catalogLoading}
              emptyLabel="Sin asignar"
              searchPlaceholder="Buscar cliente…"
            />
          </div>

          {canPickSoftware && (
            <div className="block">
              <span className="mb-1.5 block text-sm font-medium">Software</span>
              <SearchableSelect
                value={form.softwareId}
                onChange={(softwareId) =>
                  setForm((f) => ({ ...f, softwareId }))
                }
                options={softwareSearchOptions}
                disabled={disabled}
                loading={catalogLoading}
                emptyLabel="Sin asignar"
                searchPlaceholder="Buscar software…"
              />
            </div>
          )}

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end [&_button]:w-full sm:[&_button]:w-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="rounded-lg px-4 py-2 text-sm font-medium text-muted hover:bg-foreground/5 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={busy || modelsLoading || catalogLoading}
              className={cn(
                "inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground",
                busy && "cursor-not-allowed opacity-70",
              )}
            >
              {busy && <Loader2 className="size-4 animate-spin" />}
              Crear lote
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
