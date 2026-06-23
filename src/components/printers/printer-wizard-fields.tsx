"use client";

import { BooleanToggle } from "@/components/ui/boolean-toggle";
import { FieldLabel } from "@/components/ui/field-label";
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
  PRINTER_STATUS_LABELS,
  type PrinterFormValues,
} from "@/lib/printer-form";
import type { SelectOption } from "@/components/printers/printer-form-dialog";
import { DEVICE_TYPES, PRINTER_STATUSES } from "@/types/printer";
import { cn } from "@/lib/utils";

export type PrinterWizardSection =
  | "equipment"
  | "operation"
  | "assignment"
  | "technical";

const inputClass = formFieldInputClass;

type WizardFieldsProps = {
  form: PrinterFormValues;
  setForm: React.Dispatch<React.SetStateAction<PrinterFormValues>>;
  saving: boolean;
  modelsLoading: boolean;
  catalogLoading: boolean;
  modelOptions: SelectOption[];
  distributorOptions: SelectOption[];
  clientOptions: SelectOption[];
  softwareOptions: SelectOption[];
  canPickSoftware: boolean;
  lockDistributor: boolean;
  fieldErrors: Partial<Record<keyof PrinterFormValues, string>>;
  omitFiscalSerial?: boolean;
};

function toSearchableOptions(options: SelectOption[]): SearchableSelectOption[] {
  return options.map((opt) => ({
    value: String(opt.id),
    label: opt.label,
    searchText: String(opt.id),
  }));
}

export function PrinterWizardFields({
  form,
  setForm,
  saving,
  modelsLoading,
  catalogLoading,
  modelOptions,
  distributorOptions,
  clientOptions,
  softwareOptions,
  canPickSoftware,
  lockDistributor,
  fieldErrors,
  omitFiscalSerial = false,
  section,
}: WizardFieldsProps & { section: PrinterWizardSection }) {
  const disabled = saving || modelsLoading || catalogLoading;
  const modelSelectDisabled = disabled || modelOptions.length === 0;

  if (section === "equipment") {
    return (
      <fieldset className="space-y-4">
        <legend className="sr-only">Equipo fiscal</legend>
        {modelOptions.length === 0 && !modelsLoading && (
          <p className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
            No se pudo cargar el catálogo de modelos. Indica el ID del modelo
            manualmente o solicita acceso al catálogo de modelos fiscales.
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={cn("block", omitFiscalSerial && "sm:col-span-2")}>
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

          {!omitFiscalSerial ? (
            <label className="block">
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
          ) : null}
        </div>
      </fieldset>
    );
  }

  if (section === "operation") {
    return (
      <fieldset className="space-y-4">
        <legend className="sr-only">Estado operativo</legend>
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
          <div className="block">
            <FieldLabel>Estado de pago</FieldLabel>
            <BooleanToggle
              value={form.paid}
              onChange={(paid) => setForm((f) => ({ ...f, paid }))}
              disabled={disabled}
              falseLabel="No pagada"
              trueLabel="Pagada"
              falseTone={PRINTER_PAID_TOGGLE_TONE.false}
              trueTone={PRINTER_PAID_TOGGLE_TONE.true}
              ariaLabel="Estado de pago de la impresora"
            />
          </div>
        </div>
      </fieldset>
    );
  }

  if (section === "assignment") {
    return (
      <fieldset className="space-y-4">
        <legend className="sr-only">Distribución y cliente</legend>
        <div
          className={cn(
            "grid gap-4",
            lockDistributor ? "sm:grid-cols-1" : "sm:grid-cols-2",
          )}
        >
          {!lockDistributor ? (
            <div className="block">
              <FieldLabel>Distribuidor</FieldLabel>
              <SearchableSelect
                value={form.distributorId}
                onChange={(distributorId) =>
                  setForm((f) => ({ ...f, distributorId }))
                }
                options={toSearchableOptions(distributorOptions)}
                disabled={disabled}
                loading={catalogLoading}
                emptyLabel="Sin asignar"
                searchPlaceholder="Buscar distribuidor…"
                modalTitle="Seleccionar distribuidor"
              />
            </div>
          ) : null}
          <div className="block">
            <FieldLabel>Cliente (enajenación)</FieldLabel>
            <SearchableSelect
              value={form.clientId}
              onChange={(clientId) => setForm((f) => ({ ...f, clientId }))}
              options={toSearchableOptions(clientOptions)}
              disabled={disabled}
              loading={catalogLoading}
              emptyLabel="Sin asignar"
              searchPlaceholder="Buscar cliente…"
              modalTitle="Seleccionar cliente"
            />
          </div>
        </div>
        {canPickSoftware && (
          <div className="block">
            <FieldLabel>Software</FieldLabel>
            <SearchableSelect
              value={form.softwareId}
              onChange={(softwareId) =>
                setForm((f) => ({ ...f, softwareId }))
              }
              options={toSearchableOptions(softwareOptions)}
              disabled={disabled}
              loading={catalogLoading}
              emptyLabel="Sin asignar"
              searchPlaceholder="Buscar software…"
              modalTitle="Seleccionar software"
            />
          </div>
        )}
      </fieldset>
    );
  }

  return (
    <fieldset className="space-y-4">
      <legend className="sr-only">Detalles técnicos</legend>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <FieldLabel>Fecha de enajenación</FieldLabel>
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
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
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
  );
}
