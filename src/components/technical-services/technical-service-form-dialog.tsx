"use client";

import { FormEvent, useEffect, useState } from "react";
import { X } from "lucide-react";
import { FormDialogFooter } from "@/components/ui/form-dialog-footer";
import { PhotoDocumentUpload } from "@/components/ui/photo-document-upload";
import { SearchableSelect } from "@/components/ui/searchable-select";
import type { SearchableSelectOption } from "@/components/ui/searchable-select";
import {
  emptyTechnicalServiceForm,
  technicalServiceToFormValues,
  type TechnicalServiceFormValues,
} from "@/lib/technical-service-form";
import type { TechnicalServiceResponse } from "@/types/technical-service";
import { cn } from "@/lib/utils";

type TechnicalServiceFormDialogProps = {
  mode: "create" | "edit";
  row?: TechnicalServiceResponse;
  open: boolean;
  saving: boolean;
  error: string | null;
  catalogLoading: boolean;
  canLoadPrinters: boolean;
  printerOptions: SearchableSelectOption[];
  technicianOptions: SearchableSelectOption[];
  sealOptions: SearchableSelectOption[];
  serviceCenterOptions: SearchableSelectOption[];
  distributorOptions: SearchableSelectOption[];
  onClose: () => void;
  onSubmit: (values: TechnicalServiceFormValues) => void;
  onDelete?: () => void;
  deleting?: boolean;
};

export function TechnicalServiceFormDialog({
  mode,
  row,
  open,
  saving,
  error,
  catalogLoading,
  canLoadPrinters,
  printerOptions,
  technicianOptions,
  sealOptions,
  serviceCenterOptions,
  distributorOptions,
  onClose,
  onSubmit,
  onDelete,
  deleting = false,
}: TechnicalServiceFormDialogProps) {
  const [form, setForm] = useState<TechnicalServiceFormValues>(
    emptyTechnicalServiceForm(),
  );

  useEffect(() => {
    if (!open) return;
    setForm(
      mode === "edit" && row
        ? technicalServiceToFormValues(row)
        : emptyTechnicalServiceForm(),
    );
  }, [open, mode, row]);

  if (!open) return null;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit(form);
  }

  const inputClass =
    "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-ring/20";
  const disabled = saving || catalogLoading;
  const sectionClass = "space-y-4 rounded-lg border border-border p-4";

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
      <div className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-xl">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-card-foreground">
              {mode === "create" ? "Nuevo servicio técnico" : "Editar servicio técnico"}
            </h2>
            <p className="mt-1 text-sm text-muted">
              Visita de servicio con reportes Z, precintos y evidencia fotográfica.
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

        <form onSubmit={handleSubmit} className="space-y-5">
          <fieldset className={sectionClass}>
            <legend className="px-1 text-sm font-semibold text-card-foreground">
              Asignación
            </legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <span className="mb-1.5 block text-sm font-medium">
                  Impresora
                </span>
                {canLoadPrinters && printerOptions.length > 0 ? (
                  <SearchableSelect
                    value={form.printerId}
                    onChange={(printerId) =>
                      setForm((f) => ({ ...f, printerId }))
                    }
                    options={printerOptions}
                    disabled={disabled}
                    loading={catalogLoading}
                    required
                    mono
                    searchPlaceholder="Buscar por serial…"
                  />
                ) : (
                  <input
                    type="number"
                    required
                    min={1}
                    value={form.printerId}
                    disabled={disabled}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, printerId: e.target.value }))
                    }
                    className={inputClass}
                    placeholder="ID de impresora"
                  />
                )}
              </div>
              <div>
                <span className="mb-1.5 block text-sm font-medium">Técnico</span>
                <SearchableSelect
                  value={form.technicianId}
                  onChange={(technicianId) =>
                    setForm((f) => ({ ...f, technicianId }))
                  }
                  options={technicianOptions}
                  disabled={disabled}
                  loading={catalogLoading}
                  required
                  searchPlaceholder="Buscar técnico…"
                />
              </div>
              <div>
                <span className="mb-1.5 block text-sm font-medium">
                  Centro de servicio
                </span>
                <SearchableSelect
                  value={form.serviceCenterId}
                  onChange={(serviceCenterId) =>
                    setForm((f) => ({ ...f, serviceCenterId }))
                  }
                  options={serviceCenterOptions}
                  disabled={disabled}
                  loading={catalogLoading}
                  searchPlaceholder="Buscar centro…"
                />
              </div>
              <div>
                <span className="mb-1.5 block text-sm font-medium">
                  Distribuidor
                </span>
                <SearchableSelect
                  value={form.distributorId}
                  onChange={(distributorId) =>
                    setForm((f) => ({ ...f, distributorId }))
                  }
                  options={distributorOptions}
                  disabled={disabled}
                  loading={catalogLoading}
                  searchPlaceholder="Buscar distribuidor…"
                />
              </div>
            </div>
          </fieldset>

          <fieldset className={sectionClass}>
            <legend className="px-1 text-sm font-semibold text-card-foreground">
              Visita
            </legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">Inicio</span>
                <input
                  type="datetime-local"
                  required
                  value={form.startAt}
                  disabled={disabled}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, startAt: e.target.value }))
                  }
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">Fin</span>
                <input
                  type="datetime-local"
                  required
                  value={form.endAt}
                  disabled={disabled}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, endAt: e.target.value }))
                  }
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">
                  Fecha solicitud
                </span>
                <input
                  type="date"
                  required
                  value={form.requestDate}
                  disabled={disabled}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, requestDate: e.target.value }))
                  }
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">Costo</span>
                <input
                  type="number"
                  required
                  min={0}
                  step="0.01"
                  value={form.cost}
                  disabled={disabled}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, cost: e.target.value }))
                  }
                  className={inputClass}
                />
              </label>
            </div>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">
                Falla reportada
              </span>
              <textarea
                required
                rows={2}
                value={form.reportedFailure}
                disabled={disabled}
                onChange={(e) =>
                  setForm((f) => ({ ...f, reportedFailure: e.target.value }))
                }
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">
                Observaciones
              </span>
              <textarea
                rows={2}
                value={form.notes}
                disabled={disabled}
                onChange={(e) =>
                  setForm((f) => ({ ...f, notes: e.target.value }))
                }
                className={inputClass}
              />
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.sealTampered}
                disabled={disabled}
                onChange={(e) =>
                  setForm((f) => ({ ...f, sealTampered: e.target.checked }))
                }
                className="size-4 rounded border-border"
              />
              <span className="text-sm font-medium">Precinto violentado</span>
            </label>
          </fieldset>

          <fieldset className={sectionClass}>
            <legend className="px-1 text-sm font-semibold text-card-foreground">
              Reportes Z
            </legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">Z inicial</span>
                <input
                  type="number"
                  required
                  min={0}
                  value={form.initialZReport}
                  disabled={disabled}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, initialZReport: e.target.value }))
                  }
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">Z final</span>
                <input
                  type="number"
                  required
                  min={0}
                  value={form.finalZReport}
                  disabled={disabled}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, finalZReport: e.target.value }))
                  }
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">
                  Fecha Z inicial
                </span>
                <input
                  type="datetime-local"
                  required
                  value={form.initialZDate}
                  disabled={disabled}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, initialZDate: e.target.value }))
                  }
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">
                  Fecha Z final
                </span>
                <input
                  type="datetime-local"
                  required
                  value={form.finalZDate}
                  disabled={disabled}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, finalZDate: e.target.value }))
                  }
                  className={inputClass}
                />
              </label>
            </div>
          </fieldset>

          <fieldset className={sectionClass}>
            <legend className="px-1 text-sm font-semibold text-card-foreground">
              Precintos
            </legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <span className="mb-1.5 block text-sm font-medium">Instalado</span>
                <SearchableSelect
                  value={form.installedSealId}
                  onChange={(installedSealId) =>
                    setForm((f) => ({ ...f, installedSealId }))
                  }
                  options={sealOptions}
                  disabled={disabled}
                  loading={catalogLoading}
                  searchPlaceholder="Buscar precinto…"
                  mono
                />
              </div>
              <div>
                <span className="mb-1.5 block text-sm font-medium">Retirado</span>
                <SearchableSelect
                  value={form.removedSealId}
                  onChange={(removedSealId) =>
                    setForm((f) => ({ ...f, removedSealId }))
                  }
                  options={sealOptions}
                  disabled={disabled}
                  loading={catalogLoading}
                  searchPlaceholder="Buscar precinto…"
                  mono
                />
              </div>
            </div>
          </fieldset>

          <div className="block">
            <span className="mb-1.5 block text-sm font-medium">Fotos</span>
            <PhotoDocumentUpload
              folder="technical-services"
              urls={form.photoUrls}
              onChange={(photoUrls) => setForm((f) => ({ ...f, photoUrls }))}
              disabled={disabled}
              ariaLabel="Subir fotos del servicio técnico"
              addLabel="Añadir fotos"
              requiredHint="Se requiere al menos una foto."
            />
          </div>

          <FormDialogFooter
            mode={mode}
            saving={saving}
            deleting={deleting}
            submitDisabled={catalogLoading || form.photoUrls.length === 0}
            onClose={onClose}
            onDelete={onDelete}
          />
        </form>
      </div>
    </div>
  );
}
