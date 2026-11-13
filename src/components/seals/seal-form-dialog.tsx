"use client";

import { FormEvent, useEffect, useId, useState } from "react";
import { CalendarClock, Loader2, Stamp, X } from "lucide-react";
import { FieldLabel } from "@/components/ui/field-label";
import { FormDialogFooterBar } from "@/components/ui/form-dialog-footer";
import { zodFieldErrors } from "@/lib/form-zod";
import { sealFormSchema } from "@/lib/schemas/seal-form-schema";
import { formFieldInputClass } from "@/lib/toggle-button-styles";
import {
  emptySealForm,
  SEAL_COLOR_LABELS,
  SEAL_STATUS_LABELS,
  sealToFormValues,
  type SealFormValues,
} from "@/lib/seal-form";
import {
  PrinterSelect,
  type PrinterSelectOption,
} from "@/components/printers/printer-select";
import type { SealResponse } from "@/types/seal";
import { SEAL_COLORS, SEAL_STATUSES } from "@/types/seal";
import { cn } from "@/lib/utils";

export type { PrinterSelectOption };

type SealFormDialogProps = {
  mode: "create" | "edit";
  seal?: SealResponse;
  open: boolean;
  saving: boolean;
  error: string | null;
  printerOptions: PrinterSelectOption[];
  printersLoading: boolean;
  onClose: () => void;
  onSubmit: (values: SealFormValues) => void;
};

type WizardStep = 1 | 2;

const FORM_STEPS: { step: WizardStep; label: string }[] = [
  { step: 1, label: "Identificación" },
  { step: 2, label: "Asignación y fechas" },
];

const STEP_ICONS = {
  1: Stamp,
  2: CalendarClock,
} as const;

function stepSubtitle(step: WizardStep): string {
  switch (step) {
    case 1:
      return "Serial, color y estatus del precinto fiscal.";
    case 2:
      return "Impresora asociada y fechas operativas.";
  }
}

export function SealFormDialog({
  mode,
  seal,
  open,
  saving,
  error,
  printerOptions,
  printersLoading,
  onClose,
  onSubmit,
}: SealFormDialogProps) {
  const formId = useId();
  const titleId = useId();
  const [form, setForm] = useState<SealFormValues>(emptySealForm());
  const [step, setStep] = useState<WizardStep>(1);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof SealFormValues, string>>
  >({});

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && seal) {
      setForm(sealToFormValues(seal));
    } else {
      setForm(emptySealForm());
    }
    setStep(1);
    setFieldErrors({});
  }, [open, mode, seal]);

  if (!open) return null;

  function goToStep(target: WizardStep) {
    setFieldErrors({});
    setStep(target);
  }

  function goNext() {
    const parsed = sealFormSchema.safeParse(form);
    const errors = zodFieldErrors(parsed);
    if (errors && (errors.serial || errors.color || errors.status)) {
      setFieldErrors({
        serial: errors.serial,
        color: errors.color,
        status: errors.status,
      });
      return;
    }
    setFieldErrors({});
    if (step < 2) {
      setStep(2);
    }
  }

  function goBack() {
    setFieldErrors({});
    setStep((s) => (s > 1 ? ((s - 1) as WizardStep) : 1));
  }

  function handleFormSubmit(e: FormEvent) {
    e.preventDefault();
    if (step < 2) {
      goNext();
      return;
    }
    const parsed = sealFormSchema.safeParse(form);
    const errors = zodFieldErrors(parsed);
    if (errors) {
      setFieldErrors(errors);
      if (errors.serial || errors.color || errors.status) {
        setStep(1);
      }
      return;
    }
    if (!parsed.success) return;
    setFieldErrors({});
    onSubmit(form);
  }

  const inputClass = formFieldInputClass;
  const disabled = saving || printersLoading;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4"
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
      <div className="relative flex max-h-[min(92vh,100dvh)] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-border bg-card shadow-xl">
        <div className="shrink-0 border-b border-border px-4 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2
                id={titleId}
                className="text-base font-semibold leading-snug text-card-foreground sm:text-lg"
              >
                {mode === "create" ? "Nuevo precinto" : "Editar precinto"}
              </h2>
              <p className="mt-1 text-sm text-muted">{stepSubtitle(step)}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-muted hover:bg-foreground/5"
              aria-label="Cerrar"
            >
              <X className="size-5" />
            </button>
          </div>

          <nav className="mt-4 flex gap-1" aria-label="Pasos del registro">
            {FORM_STEPS.map(({ step: s, label }) => {
              const Icon = STEP_ICONS[s];
              const isActive = step === s;
              const isDone = step > s;
              return (
                <button
                  key={s}
                  type="button"
                  disabled={saving}
                  onClick={() => goToStep(s)}
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
          <form
            id={formId}
            onSubmit={handleFormSubmit}
            className="flex h-full flex-col"
          >
            {error && (
              <p
                role="alert"
                className="mb-4 shrink-0 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-300"
              >
                {error}
              </p>
            )}

            {step === 1 ? (
              <fieldset className="space-y-4">
                <legend className="sr-only">Identificación del precinto</legend>
                <label className="block">
                  <FieldLabel required>Serial</FieldLabel>
                  <input
                    type="text"
                    required
                    value={form.serial}
                    disabled={disabled}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, serial: e.target.value }))
                    }
                    className={cn(inputClass, "font-mono")}
                    placeholder="SN-001"
                  />
                  {fieldErrors.serial ? (
                    <span className="mt-1 block text-xs text-rose-600 dark:text-rose-400">
                      {fieldErrors.serial}
                    </span>
                  ) : null}
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <FieldLabel required>Color</FieldLabel>
                    <select
                      required
                      value={form.color}
                      disabled={disabled}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          color: e.target.value as SealFormValues["color"],
                        }))
                      }
                      className={inputClass}
                    >
                      {SEAL_COLORS.map((color) => (
                        <option key={color} value={color}>
                          {SEAL_COLOR_LABELS[color]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <FieldLabel required>Estatus</FieldLabel>
                    <select
                      required
                      value={form.status}
                      disabled={disabled}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          status: e.target.value as SealFormValues["status"],
                        }))
                      }
                      className={inputClass}
                    >
                      {SEAL_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {SEAL_STATUS_LABELS[status]}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </fieldset>
            ) : (
              <fieldset className="space-y-4">
                <legend className="sr-only">Asignación y fechas operativas</legend>
                <div className="block">
                  <FieldLabel>Impresora</FieldLabel>
                  {printerOptions.length > 0 ? (
                    <PrinterSelect
                      value={form.printerId}
                      onChange={(printerId) =>
                        setForm((f) => ({ ...f, printerId }))
                      }
                      options={printerOptions}
                      disabled={disabled}
                      loading={printersLoading}
                    />
                  ) : (
                    <input
                      type="number"
                      min={1}
                      value={form.printerId}
                      disabled={disabled}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, printerId: e.target.value }))
                      }
                      className={inputClass}
                      placeholder="ID de impresora (opcional)"
                    />
                  )}
                </div>

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
                    <FieldLabel>Fecha de retiro</FieldLabel>
                    <input
                      type="datetime-local"
                      value={form.removalDate}
                      disabled={disabled}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, removalDate: e.target.value }))
                      }
                      className={inputClass}
                    />
                  </label>
                </div>
              </fieldset>
            )}
          </form>
        </div>

        <div className="shrink-0 border-t border-border px-4 py-4 sm:px-6">
          <FormDialogFooterBar>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between [&_button]:w-full sm:[&_button]:w-auto">
              <button
                type="button"
                onClick={goBack}
                disabled={saving || step === 1}
                className="inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm font-medium text-muted hover:bg-foreground/5 disabled:opacity-50"
              >
                Atrás
              </button>
              <div className="flex flex-col-reverse gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={saving}
                  className="inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm font-medium text-muted hover:bg-foreground/5 disabled:opacity-50"
                >
                  Cancelar
                </button>
                {step < 2 ? (
                  <button
                    type="submit"
                    form={formId}
                    disabled={disabled}
                    className="inline-flex h-10 items-center justify-center rounded-lg bg-accent px-4 text-sm font-medium text-accent-foreground disabled:opacity-50"
                  >
                    Siguiente
                  </button>
                ) : (
                  <button
                    type="submit"
                    form={formId}
                    disabled={disabled}
                    className={cn(
                      "flex h-10 items-center justify-center gap-2 rounded-lg bg-accent px-4 text-sm font-medium text-accent-foreground",
                      disabled && "cursor-not-allowed opacity-70",
                    )}
                  >
                    {saving && <Loader2 className="size-4 animate-spin" />}
                    {mode === "create" ? "Crear precinto" : "Guardar precinto"}
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
