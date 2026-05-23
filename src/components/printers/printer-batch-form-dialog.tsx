"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { SelectOption } from "@/components/printers/printer-form-dialog";
import { BooleanToggle } from "@/components/ui/boolean-toggle";
import { FieldLabel } from "@/components/ui/field-label";
import {
  BatchFormDialog,
  BatchFormStepSection,
  BATCH_FORM_INPUT_CLASS,
} from "@/components/ui/batch-form-dialog";
import {
  SearchableSelect,
  type SearchableSelectOption,
} from "@/components/ui/searchable-select";
import {
  emptySerialRangeForm,
  SerialRangeFields,
  type SerialRangeFormValues,
} from "@/components/ui/serial-range-fields";
import {
  DEVICE_TYPE_LABELS,
  emptyPrinterForm,
  PRINTER_STATUS_LABELS,
  type PrinterFormValues,
} from "@/lib/printer-form";
import { buildSerialRange } from "@/lib/serial-range";
import { DEVICE_TYPES, PRINTER_STATUSES } from "@/types/printer";

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
  const [range, setRange] = useState<SerialRangeFormValues>(emptySerialRangeForm());
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

  const disabled = saving || modelsLoading || catalogLoading;
  const busy = saving;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const serials = buildSerialRange(range, { mode: "fiscal" });
    if (typeof serials === "string") return;
    onSubmit({ serials, base: form });
  }

  return (
    <BatchFormDialog
      open={open}
      title="Crear impresoras por lote"
      error={error}
      progress={progress}
      busy={busy}
      submitDisabled={disabled}
      onClose={onClose}
      onSubmit={handleSubmit}
    >
      <SerialRangeFields
        mode="fiscal"
        values={range}
        onChange={setRange}
        disabled={disabled}
      />

      <BatchFormStepSection
        title="Mismos valores para todo el lote"
        description="Modelo, estatus, distribuidor, cliente y demás campos se aplican a cada impresora del rango. Solo cambia el serial fiscal."
      >
        <label className="block">
          <FieldLabel required>Modelo fiscal</FieldLabel>
          {modelOptions.length > 0 ? (
            <select
              required
              value={form.modelId}
              disabled={disabled}
              onChange={(e) =>
                setForm((f) => ({ ...f, modelId: e.target.value }))
              }
              className={BATCH_FORM_INPUT_CLASS}
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
              className={BATCH_FORM_INPUT_CLASS}
              placeholder="ID del modelo"
            />
          )}
        </label>

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
              className={BATCH_FORM_INPUT_CLASS}
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
              className={BATCH_FORM_INPUT_CLASS}
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
              className={BATCH_FORM_INPUT_CLASS}
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
              ariaLabel="Estado de pago de la impresora"
            />
          </div>
        </div>

        <div className="block">
          <FieldLabel>Distribuidor</FieldLabel>
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
          <FieldLabel>Cliente</FieldLabel>
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
            />
          </div>
        )}
      </BatchFormStepSection>
    </BatchFormDialog>
  );
}
