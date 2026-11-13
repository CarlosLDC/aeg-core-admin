"use client";

import { FormEvent, useEffect, useId, useState } from "react";
import { FileCheck2, Loader2, Printer, X } from "lucide-react";
import { FieldLabel } from "@/components/ui/field-label";
import { FormDialogFooterBar } from "@/components/ui/form-dialog-footer";
import {
  toPrinterModelRequest,
  type PrinterModelFormValues,
} from "@/lib/printer-model-form";
import { formFieldInputClass } from "@/lib/toggle-button-styles";
import { cn } from "@/lib/utils";
import type { PrinterModelResponse } from "@/types/printer-model";

type PrinterModelFormDialogProps = {
  mode: "create" | "edit";
  model?: PrinterModelResponse;
  open: boolean;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (values: PrinterModelFormValues) => void;
};

type WizardStep = 1 | 2;

const FORM_STEPS: { step: WizardStep; label: string }[] = [
  { step: 1, label: "Identificación" },
  { step: 2, label: "Homologación" },
];

const STEP_ICONS = {
  1: Printer,
  2: FileCheck2,
} as const;

function stepSubtitle(step: WizardStep): string {
  switch (step) {
    case 1:
      return "Código del modelo, prefijo serial y precio.";
    case 2:
      return "Providencia y fecha de homologación.";
  }
}

const emptyForm: PrinterModelFormValues = {
  modelCode: "",
  serialPrefix: "",
  price: "",
  providencia: "",
  approvalDate: "",
};

function toDateInputValue(iso: string | undefined): string {
  if (!iso) return "";
  return iso.length >= 10 ? iso.slice(0, 10) : iso;
}

export function PrinterModelFormDialog({
  mode,
  model,
  open,
  saving,
  error,
  onClose,
  onSubmit,
}: PrinterModelFormDialogProps) {
  const formId = useId();
  const [form, setForm] = useState<PrinterModelFormValues>(emptyForm);
  const [step, setStep] = useState<WizardStep>(1);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && model) {
      setForm({
        modelCode: model.modelCode,
        serialPrefix: model.serialPrefix ?? "",
        price: String(model.price),
        providencia: model.providencia ?? "",
        approvalDate: toDateInputValue(model.approvalDate),
      });
    } else {
      setForm(emptyForm);
    }
    setStep(1);
    setLocalError(null);
  }, [open, mode, model]);

  if (!open) return null;

  function goToStep(target: WizardStep) {
    setLocalError(null);
    setStep(target);
  }

  function goNext() {
    setLocalError(null);
    if (step < 2) {
      setStep(2);
    }
  }

  function goBack() {
    setLocalError(null);
    setStep((s) => (s > 1 ? ((s - 1) as WizardStep) : 1));
  }

  function submitRegistration() {
    const bodyOrError = toPrinterModelRequest(form);
    if (typeof bodyOrError === "string") {
      setLocalError(bodyOrError);
      setStep(1);
      return;
    }
    setLocalError(null);
    onSubmit({
      ...form,
      modelCode: form.modelCode.trim(),
      serialPrefix: form.serialPrefix.trim().toUpperCase(),
    });
  }

  function handleFormSubmit(e: FormEvent) {
    e.preventDefault();
    if (step < 2) {
      goNext();
      return;
    }
    submitRegistration();
  }

  const inputClass = formFieldInputClass;
  const displayError = localError ?? error;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="printer-model-wizard-title"
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
                id="printer-model-wizard-title"
                className="text-lg font-semibold text-card-foreground"
              >
                {mode === "create"
                  ? "Nuevo modelo fiscal"
                  : "Editar modelo fiscal"}
              </h2>
              <p className="mt-1 text-sm text-muted">{stepSubtitle(step)}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-muted hover:bg-foreground/5"
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
            {displayError && (
              <p
                role="alert"
                className="mb-4 shrink-0 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-300"
              >
                {displayError}
              </p>
            )}

            {step === 1 ? (
              <fieldset className="space-y-4">
                <legend className="sr-only">Identificación del modelo</legend>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <FieldLabel required>Modelo</FieldLabel>
                    <input
                      type="text"
                      required
                      disabled={saving}
                      value={form.modelCode}
                      placeholder="AEG-R1"
                      onChange={(e) =>
                        setForm((f) => ({ ...f, modelCode: e.target.value }))
                      }
                      className={inputClass}
                    />
                  </label>
                  <label className="block">
                    <FieldLabel required>Prefijo serial (3 letras)</FieldLabel>
                    <input
                      type="text"
                      required
                      disabled={saving}
                      maxLength={3}
                      value={form.serialPrefix}
                      placeholder="GRA"
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          serialPrefix: e.target.value
                            .replace(/[^a-zA-Z]/g, "")
                            .toUpperCase(),
                        }))
                      }
                      className={cn(inputClass, "font-mono uppercase")}
                    />
                  </label>
                </div>
                <label className="block">
                  <FieldLabel required>Precio</FieldLabel>
                  <input
                    type="number"
                    required
                    disabled={saving}
                    min={0}
                    step="0.01"
                    value={form.price}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, price: e.target.value }))
                    }
                    className={inputClass}
                  />
                </label>
              </fieldset>
            ) : (
              <fieldset className="space-y-4">
                <legend className="sr-only">Homologación</legend>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <FieldLabel>Providencia</FieldLabel>
                    <input
                      type="text"
                      disabled={saving}
                      value={form.providencia}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, providencia: e.target.value }))
                      }
                      className={inputClass}
                    />
                  </label>

                  <label className="block">
                    <FieldLabel>Fecha de homologación</FieldLabel>
                    <input
                      type="date"
                      disabled={saving}
                      value={form.approvalDate}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, approvalDate: e.target.value }))
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
                className="rounded-lg px-4 py-2 text-sm font-medium text-muted hover:bg-foreground/5 disabled:opacity-50"
              >
                Atrás
              </button>
              <div className="flex flex-col-reverse gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-muted hover:bg-foreground/5"
                >
                  Cancelar
                </button>
                {step < 2 ? (
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
                    {saving && <Loader2 className="size-4 animate-spin" />}
                    {mode === "create" ? "Crear modelo" : "Guardar modelo"}
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
