"use client";

import { FormEvent, useEffect, useId, useRef, useState } from "react";
import {
  Cpu,
  FileCode2,
  Loader2,
  StickyNote,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { FieldLabel } from "@/components/ui/field-label";
import { FormDialogFooterBar } from "@/components/ui/form-dialog-footer";
import {
  formFieldInputClass,
  formFieldNativeSelectClass,
} from "@/lib/toggle-button-styles";
import { cn } from "@/lib/utils";
import type { FirmwareResponse } from "@/types/firmware";

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
  mode: "create" | "edit";
  open: boolean;
  saving: boolean;
  error: string | null;
  modelOptions: FirmwareModelOption[];
  firmware?: FirmwareResponse | null;
  onClose: () => void;
  onSubmit: (values: FirmwareUploadValues) => void;
};

type WizardStep = 1 | 2 | 3;

const CREATE_STEPS: { step: WizardStep; label: string }[] = [
  { step: 1, label: "Binario" },
  { step: 2, label: "Versión" },
  { step: 3, label: "Notas" },
];

const EDIT_STEPS: { step: WizardStep; label: string }[] = [
  { step: 1, label: "Versión" },
  { step: 2, label: "Notas" },
];

const CREATE_ICONS = {
  1: Upload,
  2: Cpu,
  3: StickyNote,
} as const;

const EDIT_ICONS = {
  1: Cpu,
  2: StickyNote,
} as const;

const emptyForm: FirmwareUploadValues = {
  version: "",
  printerModelId: "",
  notes: "",
  file: null,
};

const VERSION_PATTERN = /^\d+\.\d+\.\d+$/;

function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}

function stepSubtitle(mode: "create" | "edit", step: WizardStep): string {
  if (mode === "edit") {
    switch (step) {
      case 1:
        return "Actualice la versión semántica y, si aplica, el modelo fiscal.";
      case 2:
        return "Notas u observaciones opcionales sobre esta versión.";
      default:
        return "";
    }
  }
  switch (step) {
    case 1:
      return "Seleccione un único archivo .bin.";
    case 2:
      return "Indique la versión semántica y, si aplica, el modelo fiscal.";
    case 3:
      return "Notas u observaciones opcionales sobre esta versión.";
    default:
      return "";
  }
}

export function FirmwareUploadDialog({
  mode,
  open,
  saving,
  error,
  modelOptions,
  firmware = null,
  onClose,
  onSubmit,
}: FirmwareUploadDialogProps) {
  const formId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<WizardStep>(1);
  const [form, setForm] = useState<FirmwareUploadValues>(emptyForm);
  const [stepError, setStepError] = useState<string | null>(null);

  const steps = mode === "create" ? CREATE_STEPS : EDIT_STEPS;
  const lastStep = steps[steps.length - 1]!.step;

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setStepError(null);
    if (mode === "edit" && firmware) {
      setForm({
        version: firmware.version,
        printerModelId:
          firmware.printerModelId != null ? String(firmware.printerModelId) : "",
        notes: firmware.notes ?? "",
        file: null,
      });
    } else {
      setForm(emptyForm);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [open, mode, firmware]);

  if (!open) return null;

  function validateStep(target: WizardStep): string | null {
    if (mode === "create" && target === 1) {
      if (!form.file) return "Selecciona un archivo .bin.";
      if (!form.file.name.toLowerCase().endsWith(".bin")) {
        return "El archivo debe tener extensión .bin.";
      }
      return null;
    }
    const isVersionStep =
      (mode === "create" && target === 2) || (mode === "edit" && target === 1);
    if (isVersionStep) {
      const version = form.version.trim();
      if (!VERSION_PATTERN.test(version)) {
        return "La versión debe tener el formato x.y.z (p. ej. 1.2.3).";
      }
      return null;
    }
    return null;
  }

  function goToStep(target: WizardStep) {
    if (saving) return;
    if (target > step) {
      for (let s = step; s < target; s++) {
        const err = validateStep(s as WizardStep);
        if (err) {
          setStepError(err);
          setStep(s as WizardStep);
          return;
        }
      }
    }
    setStepError(null);
    setStep(target);
  }

  function goBack() {
    if (saving || step === 1) return;
    setStepError(null);
    setStep((current) => Math.max(1, current - 1) as WizardStep);
  }

  function goNext() {
    const err = validateStep(step);
    if (err) {
      setStepError(err);
      return;
    }
    setStepError(null);
    if (step < lastStep) {
      setStep((current) => (current + 1) as WizardStep);
    }
  }

  function submitForm() {
    for (const { step: s } of steps) {
      const err = validateStep(s);
      if (err) {
        setStepError(err);
        setStep(s);
        return;
      }
    }
    setStepError(null);
    onSubmit({
      ...form,
      version: form.version.trim(),
      notes: form.notes.trim(),
    });
  }

  function handleFormSubmit(e: FormEvent) {
    e.preventDefault();
    if (step < lastStep) {
      goNext();
      return;
    }
    submitForm();
  }

  function assignFile(file: File | null) {
    setStepError(null);
    setForm((current) => ({ ...current, file }));
    if (fileInputRef.current && !file) {
      fileInputRef.current.value = "";
    }
  }

  function openFilePicker() {
    if (saving) return;
    fileInputRef.current?.click();
  }

  const displayError = stepError ?? error;
  const title =
    mode === "create" ? "Subir versión de firmware" : "Editar versión de firmware";
  const submitLabel = mode === "create" ? "Subir" : "Guardar";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="firmware-upload-wizard-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="Cerrar"
        onClick={onClose}
      />
      <div className="relative flex max-h-[min(92vh,100dvh)] w-full max-w-xl flex-col overflow-hidden rounded-xl border border-border bg-card shadow-xl">
        <div className="shrink-0 border-b border-border px-4 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2
                id="firmware-upload-wizard-title"
                className="text-lg font-semibold text-card-foreground"
              >
                {title}
              </h2>
              <p className="mt-1 text-sm text-muted">
                {stepSubtitle(mode, step)}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="shrink-0 rounded-lg p-1.5 text-muted hover:bg-foreground/5 disabled:opacity-50"
            >
              <X className="size-5" />
            </button>
          </div>

          <nav
            className="mt-4 flex gap-1"
            aria-label={
              mode === "create" ? "Pasos de la subida" : "Pasos de la edición"
            }
          >
            {steps.map(({ step: wizardStep, label }) => {
              const Icon =
                mode === "create"
                  ? CREATE_ICONS[wizardStep]
                  : EDIT_ICONS[wizardStep as 1 | 2];
              const isActive = step === wizardStep;
              const isDone = step > wizardStep;
              return (
                <button
                  key={wizardStep}
                  type="button"
                  disabled={saving}
                  onClick={() => goToStep(wizardStep)}
                  className={cn(
                    "flex min-w-0 flex-1 flex-col items-center gap-1 rounded-lg px-2 py-2 text-center transition-colors",
                    "hover:bg-foreground/5 disabled:opacity-50",
                    isActive && "bg-accent/10 text-accent",
                    isDone && !isActive && "text-card-foreground",
                    !isActive && !isDone && "text-muted",
                  )}
                  aria-current={isActive ? "step" : undefined}
                >
                  <Icon className="size-4 shrink-0" aria-hidden />
                  <span className="text-[11px] font-medium leading-tight sm:text-xs">
                    {label}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
          {displayError ? (
            <p
              role="alert"
              className="mb-4 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-300"
            >
              {displayError}
            </p>
          ) : null}

          <form id={formId} onSubmit={handleFormSubmit} className="space-y-4">
            {mode === "edit" && firmware ? (
              <div className="flex items-center gap-2.5 rounded-lg border border-border bg-foreground/[0.02] p-2.5">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-foreground/5">
                  <FileCode2 className="size-4 text-muted" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-card-foreground">
                    {firmware.fileName}
                  </p>
                  <p className="text-xs text-muted">
                    {formatBytes(firmware.sizeBytes)} · binario sin cambios
                  </p>
                </div>
              </div>
            ) : null}

            {mode === "create" && step === 1 ? (
              <div className="space-y-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".bin,application/octet-stream"
                  className="sr-only"
                  disabled={saving}
                  onChange={(e) => {
                    const next = e.target.files?.[0] ?? null;
                    assignFile(next);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                />

                {!form.file ? (
                  <div
                    role="group"
                    aria-label="Subir archivo de firmware"
                    className={cn(
                      "shrink-0 rounded-xl border border-dashed border-border bg-foreground/[0.02] px-4 py-5",
                      saving && "opacity-60",
                    )}
                  >
                    <button
                      type="button"
                      disabled={saving}
                      onClick={openFilePicker}
                      className="group flex w-full flex-col items-center gap-3 rounded-lg px-1 py-0.5 text-center transition-colors enabled:hover:bg-foreground/[0.02] disabled:cursor-not-allowed"
                    >
                      <div className="flex size-11 items-center justify-center rounded-full bg-accent/10 text-accent">
                        <Upload className="size-5" aria-hidden />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-card-foreground">
                          Seleccionar archivo .bin
                        </p>
                        <p className="text-xs leading-relaxed text-muted">
                          Un solo binario por subida
                        </p>
                        <p className="pt-0.5 text-xs text-muted/90">
                          Se requiere un archivo .bin.
                        </p>
                      </div>
                      <span
                        className={cn(
                          "inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 py-2.5 text-sm font-medium text-foreground",
                          !saving && "group-hover:border-accent/30",
                        )}
                      >
                        Elegir archivo
                      </span>
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2.5 rounded-lg border border-border bg-background p-2.5">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-foreground/5">
                      <FileCode2 className="size-4 text-muted" aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-card-foreground">
                        {form.file.name}
                      </p>
                      <p className="text-xs text-muted">
                        {formatBytes(form.file.size)}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => assignFile(null)}
                      className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-rose-500/10 hover:text-rose-600 disabled:opacity-50"
                      aria-label="Quitar archivo"
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </button>
                  </div>
                )}
              </div>
            ) : null}

            {(mode === "create" && step === 2) ||
            (mode === "edit" && step === 1) ? (
              <div className="space-y-4">
                <label className="block">
                  <FieldLabel required>Versión</FieldLabel>
                  <input
                    type="text"
                    required
                    value={form.version}
                    disabled={saving}
                    placeholder="1.2.3"
                    onChange={(e) =>
                      setForm((current) => ({
                        ...current,
                        version: e.target.value,
                      }))
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
                      setForm((current) => ({
                        ...current,
                        printerModelId: e.target.value,
                      }))
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
              </div>
            ) : null}

            {(mode === "create" && step === 3) ||
            (mode === "edit" && step === 2) ? (
              <label className="block">
                <FieldLabel>Notas</FieldLabel>
                <textarea
                  value={form.notes}
                  disabled={saving}
                  rows={5}
                  onChange={(e) =>
                    setForm((current) => ({
                      ...current,
                      notes: e.target.value,
                    }))
                  }
                  className={`${formFieldInputClass} h-auto min-h-[8rem] py-2`}
                  placeholder="Cambios, instrucciones o comentarios opcionales"
                />
              </label>
            ) : null}
          </form>
        </div>

        <div className="shrink-0 border-t border-border px-4 py-4 sm:px-6">
          <FormDialogFooterBar>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between [&_button]:w-full sm:[&_button]:w-auto">
              <button
                type="button"
                onClick={goBack}
                disabled={saving || step === 1}
                className="rounded-lg px-4 py-2 text-sm font-medium text-muted hover:bg-foreground/5 disabled:opacity-50"
              >
                Atrás
              </button>
              <div className="flex flex-col-reverse gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={saving}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-muted hover:bg-foreground/5 disabled:opacity-50"
                >
                  Cancelar
                </button>
                {step < lastStep ? (
                  <button
                    type="submit"
                    form={formId}
                    disabled={saving}
                    className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground disabled:opacity-50"
                  >
                    Siguiente
                  </button>
                ) : (
                  <button
                    type="submit"
                    form={formId}
                    disabled={saving}
                    className={cn(
                      "flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground",
                      saving && "cursor-not-allowed opacity-70",
                    )}
                  >
                    {saving ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                    ) : null}
                    {submitLabel}
                  </button>
                )}
              </div>
            </div>
          </FormDialogFooterBar>
        </div>
      </div>
    </div>
  );
}
