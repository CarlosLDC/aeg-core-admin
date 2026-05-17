"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Loader2, X } from "lucide-react";
import { BooleanToggle } from "@/components/ui/boolean-toggle";
import {
  SearchableSelect,
  type SearchableSelectOption,
} from "@/components/ui/searchable-select";
import {
  DEVICE_TYPE_LABELS,
  emptyPrinterForm,
  PRINTER_STATUS_LABELS,
  printerToFormValues,
  type PrinterFormValues,
} from "@/lib/printer-form";
import type { PrinterResponse } from "@/types/printer";
import { DEVICE_TYPES, PRINTER_STATUSES } from "@/types/printer";
import { cn } from "@/lib/utils";

export type SelectOption = { id: number; label: string };

function toSearchableOptions(options: SelectOption[]): SearchableSelectOption[] {
  return options.map((opt) => ({
    value: String(opt.id),
    label: opt.label,
    searchText: String(opt.id),
  }));
}

type PrinterFormDialogProps = {
  mode: "create" | "edit";
  printer?: PrinterResponse;
  open: boolean;
  saving: boolean;
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
  onSubmit: (values: PrinterFormValues) => void;
};

export function PrinterFormDialog({
  mode,
  printer,
  open,
  saving,
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
}: PrinterFormDialogProps) {
  const [form, setForm] = useState<PrinterFormValues>(emptyPrinterForm());

  useEffect(() => {
    if (!open) return;
    const distributorDefault =
      defaultDistributorId != null ? String(defaultDistributorId) : "";
    if (mode === "edit" && printer) {
      setForm(
        printerToFormValues(printer, {
          distributorId:
            lockDistributor && defaultDistributorId != null
              ? distributorDefault
              : undefined,
        }),
      );
    } else {
      setForm(
        emptyPrinterForm({
          distributorId: lockDistributor ? distributorDefault : "",
        }),
      );
    }
  }, [open, mode, printer, lockDistributor, defaultDistributorId]);

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

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit(form);
  }

  const inputClass =
    "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-ring/20";
  const disabled = saving || modelsLoading || catalogLoading;
  const modelSelectDisabled = disabled || modelOptions.length === 0;

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
      />
      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-xl">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-card-foreground">
              {mode === "create" ? "Nueva impresora" : "Editar impresora"}
            </h2>
            <p className="mt-1 text-sm text-muted">
              Equipo fiscal con serial, modelo y asignación operativa.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted hover:bg-foreground/5"
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

        {modelOptions.length === 0 && !modelsLoading && (
          <p className="mb-4 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
            No se pudo cargar el catálogo de modelos. Indica el ID del modelo
            manualmente o solicita acceso al catálogo de modelos fiscales.
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">
              Modelo fiscal
            </span>
            {modelOptions.length > 0 ? (
              <select
                required
                value={form.modelId}
                disabled={modelSelectDisabled}
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

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">
              Serial fiscal
            </span>
            <input
              type="text"
              required
              maxLength={10}
              value={form.fiscalSerial}
              disabled={disabled}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  fiscalSerial: e.target.value.toUpperCase(),
                }))
              }
              className={cn(inputClass, "font-mono uppercase")}
              placeholder="ABC1234567"
            />
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

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">
                Fecha de instalación
              </span>
              <input
                type="datetime-local"
                value={form.installationDate}
                disabled={disabled}
                onChange={(e) =>
                  setForm((f) => ({ ...f, installationDate: e.target.value }))
                }
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">
                Firmware
              </span>
              <input
                type="text"
                value={form.versionFirmware}
                disabled={disabled}
                onChange={(e) =>
                  setForm((f) => ({ ...f, versionFirmware: e.target.value }))
                }
                className={inputClass}
                placeholder="1.0.0"
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">
              Dirección MAC
            </span>
            <input
              type="text"
              value={form.macAddress}
              disabled={disabled}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  macAddress: e.target.value.toUpperCase(),
                }))
              }
              className={cn(inputClass, "font-mono uppercase")}
              placeholder="AA:BB:CC:DD:EE:FF"
            />
          </label>

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end [&_button]:w-full sm:[&_button]:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-muted hover:bg-foreground/5"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={disabled}
              className={cn(
                "flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground",
                disabled && "cursor-not-allowed opacity-70",
              )}
            >
              {saving && <Loader2 className="size-4 animate-spin" />}
              {mode === "create" ? "Crear" : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
