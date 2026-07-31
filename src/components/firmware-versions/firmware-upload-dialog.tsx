"use client";

import { FormEvent, useEffect, useState } from "react";
import { X } from "lucide-react";
import { FieldLabel } from "@/components/ui/field-label";
import { FormDialogFooter } from "@/components/ui/form-dialog-footer";
import {
  formFieldInputClass,
  formFieldNativeSelectClass,
} from "@/lib/toggle-button-styles";

export type FirmwareUploadValues = {
  version: string;
  printerModelId: string;
  notes: string;
  file: File | null;
};

export type FirmwareModelOption = {
  id: number;
  label: string;
};

type FirmwareUploadDialogProps = {
  open: boolean;
  saving: boolean;
  error: string | null;
  modelOptions: FirmwareModelOption[];
  onClose: () => void;
  onSubmit: (values: FirmwareUploadValues) => void;
};

const emptyForm: FirmwareUploadValues = {
  version: "",
  printerModelId: "",
  notes: "",
  file: null,
};

const VERSION_PATTERN = /^\d+\.\d+\.\d+$/;

export function FirmwareUploadDialog({
  open,
  saving,
  error,
  modelOptions,
  onClose,
  onSubmit,
}: FirmwareUploadDialogProps) {
  const [form, setForm] = useState<FirmwareUploadValues>(emptyForm);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setForm(emptyForm);
    setLocalError(null);
  }, [open]);

  if (!open) return null;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLocalError(null);

    const version = form.version.trim();
    if (!VERSION_PATTERN.test(version)) {
      setLocalError("La versión debe tener el formato x.y.z (p. ej. 1.2.3).");
      return;
    }
    if (!form.file) {
      setLocalError("Selecciona un archivo .bin.");
      return;
    }
    if (!form.file.name.toLowerCase().endsWith(".bin")) {
      setLocalError("El archivo debe tener extensión .bin.");
      return;
    }

    onSubmit({
      ...form,
      version,
      notes: form.notes.trim(),
    });
  }

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
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-xl">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-card-foreground">
              Subir versión de firmware
            </h2>
            <p className="mt-1 text-sm text-muted">
              Archivo .bin (máx. 64 MB) asociado opcionalmente a un modelo fiscal.
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

        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <FieldLabel required>Archivo .bin</FieldLabel>
            <input
              type="file"
              accept=".bin,application/octet-stream"
              required
              disabled={saving}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  file: e.target.files?.[0] ?? null,
                }))
              }
              className="block w-full text-sm text-card-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-foreground/5 file:px-3 file:py-2 file:text-sm file:font-medium file:text-card-foreground hover:file:bg-foreground/10"
            />
          </label>

          <label className="block">
            <FieldLabel required>Versión</FieldLabel>
            <input
              type="text"
              required
              value={form.version}
              disabled={saving}
              placeholder="1.2.3"
              onChange={(e) =>
                setForm((f) => ({ ...f, version: e.target.value }))
              }
              className={formFieldInputClass}
            />
          </label>

          <label className="block">
            <FieldLabel>Modelo fiscal</FieldLabel>
            <select
              value={form.printerModelId}
              disabled={saving}
              onChange={(e) =>
                setForm((f) => ({ ...f, printerModelId: e.target.value }))
              }
              className={formFieldNativeSelectClass}
            >
              <option value="">Todos los modelos</option>
              {modelOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <FieldLabel>Notas</FieldLabel>
            <textarea
              value={form.notes}
              disabled={saving}
              rows={3}
              onChange={(e) =>
                setForm((f) => ({ ...f, notes: e.target.value }))
              }
              className={`${formFieldInputClass} h-auto min-h-[5rem] py-2`}
              placeholder="Cambios o instrucciones opcionales"
            />
          </label>

          {(localError || error) && (
            <p
              role="alert"
              className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-300"
            >
              {localError || error}
            </p>
          )}

          <FormDialogFooter
            mode="create"
            saving={saving}
            onClose={onClose}
            createLabel="Subir"
          />
        </form>
      </div>
    </div>
  );
}
