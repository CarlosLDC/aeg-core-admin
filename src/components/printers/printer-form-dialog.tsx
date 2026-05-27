"use client";

import { FormEvent, useEffect, useId, useMemo, useState } from "react";
import { X } from "lucide-react";
import { FieldLabel } from "@/components/ui/field-label";
import { FormDialogFooter } from "@/components/ui/form-dialog-footer";
import { BooleanToggle } from "@/components/ui/boolean-toggle";
import {
  formFieldInputClass,
  PRINTER_PAID_TOGGLE_TONE,
} from "@/lib/toggle-button-styles";
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
import { zodFieldErrors } from "@/lib/form-zod";
import { printerFormSchema } from "@/lib/schemas/printer-form-schema";
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
  const formId = useId();
  const titleId = useId();
  const [form, setForm] = useState<PrinterFormValues>(emptyPrinterForm());
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof PrinterFormValues, string>>
  >({});

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
    setFieldErrors({});
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
    const parsed = printerFormSchema.safeParse(form);
    const errors = zodFieldErrors(parsed);
    if (errors) {
      setFieldErrors(errors);
      return;
    }
    if (!parsed.success) return;
    setFieldErrors({});
    onSubmit(form);
  }

  const inputClass = formFieldInputClass;
  const disabled = saving || modelsLoading || catalogLoading;
  const modelSelectDisabled = disabled || modelOptions.length === 0;

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
        onClick={onClose}
      />
      <div className="relative flex max-h-[min(92vh,100dvh)] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-border bg-card shadow-xl">
        <div className="shrink-0 border-b border-border px-4 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2
                id={titleId}
                className="text-lg font-semibold text-card-foreground"
              >
                {mode === "create" ? "Nueva impresora" : "Editar impresora"}
              </h2>
              <p className="mt-1 text-sm text-muted">
                {mode === "create"
                  ? "Equipo fiscal con serial, modelo y asignación operativa."
                  : "Actualiza equipo, estado, asignación y datos técnicos por sección."}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="rounded-lg p-1.5 text-muted hover:bg-foreground/5"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        <form
          id={formId}
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4 sm:px-6">
            {error && (
              <p
                role="alert"
                className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-300"
              >
                {error}
              </p>
            )}

            <fieldset className="space-y-4 rounded-xl border border-border p-4">
              <legend className="px-1 text-sm font-semibold text-card-foreground">
                Equipo fiscal
              </legend>
              {modelOptions.length === 0 && !modelsLoading && (
                <p className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
                  No se pudo cargar el catálogo de modelos. Indica el ID del
                  modelo manualmente o solicita acceso al catálogo de modelos
                  fiscales.
                </p>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block sm:col-span-2">
                  <FieldLabel required>Modelo fiscal</FieldLabel>
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

                <label className="block sm:col-span-2">
                  <FieldLabel required>Serial fiscal</FieldLabel>
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
                  {fieldErrors.fiscalSerial ? (
                    <span className="mt-1 block text-xs text-rose-600 dark:text-rose-400">
                      {fieldErrors.fiscalSerial}
                    </span>
                  ) : (
                    <p className="mt-1 text-xs text-muted">
                      Formato: 3 letras y 7 dígitos (ej. ABC1234567).
                    </p>
                  )}
                </label>
              </div>
            </fieldset>

            <fieldset className="space-y-4 rounded-xl border border-border p-4">
              <legend className="px-1 text-sm font-semibold text-card-foreground">
                Estado operativo
              </legend>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <FieldLabel required>Estatus</FieldLabel>
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
                  <FieldLabel required>Tipo de dispositivo</FieldLabel>
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
                <label className="block">
                  <FieldLabel>Precio venta final</FieldLabel>
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
                    placeholder="Opcional"
                  />
                </label>
                <div className="block">
                  <FieldLabel>Estado de pago</FieldLabel>
                  <BooleanToggle
                    value={form.paid}
                    onChange={(paid) => setForm((f) => ({ ...f, paid }))}
                    disabled={disabled}
                    falseLabel="Pendiente"
                    trueLabel="Pagada"
                    falseTone={PRINTER_PAID_TOGGLE_TONE.false}
                    trueTone={PRINTER_PAID_TOGGLE_TONE.true}
                    ariaLabel="Estado de pago de la impresora"
                  />
                </div>
              </div>
            </fieldset>

            <fieldset className="space-y-4 rounded-xl border border-border p-4">
              <legend className="px-1 text-sm font-semibold text-card-foreground">
                Asignación
              </legend>
              <div
                className={
                  lockDistributor
                    ? "grid gap-4 sm:grid-cols-1"
                    : "grid gap-4 sm:grid-cols-2"
                }
              >
                {!lockDistributor ? (
                  <div className="block">
                    <FieldLabel>Distribuidor</FieldLabel>
                    <SearchableSelect
                      value={form.distributorId}
                      onChange={(distributorId) =>
                        setForm((f) => ({ ...f, distributorId }))
                      }
                      options={distributorSearchOptions}
                      disabled={disabled}
                      loading={catalogLoading}
                      emptyLabel="Sin asignar"
                      searchPlaceholder="Buscar distribuidor…"
                      modalTitle="Seleccionar distribuidor"
                    />
                  </div>
                ) : null}
                <div className="block">
                  <FieldLabel>Cliente</FieldLabel>
                  <SearchableSelect
                    value={form.clientId}
                    onChange={(clientId) =>
                      setForm((f) => ({ ...f, clientId }))
                    }
                    options={clientSearchOptions}
                    disabled={disabled}
                    loading={catalogLoading}
                    emptyLabel="Sin asignar"
                    searchPlaceholder="Buscar cliente…"
                    modalTitle="Seleccionar cliente"
                  />
                </div>
                {canPickSoftware && (
                  <div className="block sm:col-span-2">
                    <FieldLabel>Software</FieldLabel>
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
                      modalTitle="Seleccionar software"
                    />
                  </div>
                )}
              </div>
            </fieldset>

            <fieldset className="space-y-4 rounded-xl border border-border p-4">
              <legend className="px-1 text-sm font-semibold text-card-foreground">
                Detalles técnicos
              </legend>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <FieldLabel>Fecha de instalación</FieldLabel>
                  <input
                    type="datetime-local"
                    value={form.installationDate}
                    disabled={disabled}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        installationDate: e.target.value,
                      }))
                    }
                    className={inputClass}
                  />
                </label>
                <label className="block">
                  <FieldLabel>Firmware</FieldLabel>
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
                <label className="block sm:col-span-2">
                  <FieldLabel>Dirección MAC</FieldLabel>
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
              </div>
            </fieldset>
          </div>

          <div className="shrink-0 border-t border-border px-4 py-4 sm:px-6">
            <FormDialogFooter
              mode={mode}
              saving={saving}
              submitDisabled={modelsLoading || catalogLoading}
              onClose={onClose}
            />
          </div>
        </form>
      </div>
    </div>
  );
}
