"use client";

import { FormEvent, useEffect, useId, useState } from "react";
import { ClipboardCheck, Link2, Loader2, X } from "lucide-react";
import { FieldLabel } from "@/components/ui/field-label";
import { FormDialogFooterBar } from "@/components/ui/form-dialog-footer";
import { SearchableSelect } from "@/components/ui/searchable-select";
import type { SearchableSelectOption } from "@/components/ui/searchable-select";
import {
  formFieldInputClass,
  FORM_FIELD_TEXTAREA_ROWS,
  formFieldTextareaClass,
} from "@/lib/toggle-button-styles";
import {
  ANNUAL_INSPECTION_CHECKLIST_ROWS,
  annualInspectionToFormValues,
  emptyAnnualInspectionForm,
  setAnnualInspectionChecklistField,
  type AnnualInspectionFormValues,
} from "@/lib/annual-inspection-form";
import type { AnnualInspectionResponse } from "@/types/annual-inspection";
import type { Role } from "@/types/user";
import { cn } from "@/lib/utils";

type AnnualInspectionFormDialogProps = {
  mode: "create" | "edit";
  row?: AnnualInspectionResponse;
  open: boolean;
  saving: boolean;
  error: string | null;
  catalogLoading: boolean;
  canLoadPrinters: boolean;
  printerOptions: SearchableSelectOption[];
  technicianUserOptions: SearchableSelectOption[];
  currentUserRole?: Role;
  currentUserId?: number | null;
  onClose: () => void;
  onSubmit: (values: AnnualInspectionFormValues) => void;
};

export function AnnualInspectionFormDialog({
  mode,
  row,
  open,
  saving,
  error,
  catalogLoading,
  canLoadPrinters,
  printerOptions,
  technicianUserOptions,
  currentUserRole,
  currentUserId,
  onClose,
  onSubmit,
}: AnnualInspectionFormDialogProps) {
  const formId = useId();
  const isWizard = true;
  const lockInspectorField =
    mode === "create" &&
    (currentUserRole === "DISTRIBUTOR" ||
      currentUserRole === "TECHNICIAN" ||
      currentUserRole === "SERVICE_CENTER") &&
    currentUserId != null;
  type WizardStep = 1 | 2;
  const [step, setStep] = useState<WizardStep>(1);
  const [stepError, setStepError] = useState<string | null>(null);
  const [form, setForm] = useState<AnnualInspectionFormValues>(
    emptyAnnualInspectionForm(),
  );

  useEffect(() => {
    if (!open) return;
    const base =
      mode === "edit" && row
        ? annualInspectionToFormValues(row)
        : emptyAnnualInspectionForm();
    if (lockInspectorField && currentUserId != null) {
      base.userId = String(currentUserId);
    }
    setForm(base);
    setStep(1);
    setStepError(null);
  }, [open, mode, row, lockInspectorField, currentUserId]);

  if (!open) return null;

  const inputClass = formFieldInputClass;
  const disabled = saving || catalogLoading;
  const displayError = stepError ?? error;

  const FORM_STEPS: { step: WizardStep; label: string }[] = [
    { step: 1, label: "Asignacion" },
    { step: 2, label: "Resultado" },
  ];

  const STEP_ICONS = {
    1: Link2,
    2: ClipboardCheck,
  } as const;

  function stepSubtitle(targetStep: WizardStep): string {
    switch (targetStep) {
      case 1:
        return "Selecciona una impresora asignada y el técnico responsable.";
      case 2:
        return "Registra el resultado y observaciones de la revision.";
      default:
        return "";
    }
  }

  function hasValue(value: string): boolean {
    return value.trim().length > 0;
  }

  function validateStep(targetStep: WizardStep): string | null {
    if (targetStep === 1) {
      if (!hasValue(form.printerId)) return "Selecciona una impresora.";
      if (!hasValue(form.userId)) return "Selecciona un técnico.";
      return null;
    }

    return null;
  }

  function goToStep(target: WizardStep) {
    setStepError(null);
    setStep(target);
  }

  function goBack() {
    setStepError(null);
    setStep((current) => Math.max(1, current - 1) as WizardStep);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const currentError = validateStep(step);
    if (currentError) {
      setStepError(currentError);
      return;
    }

    if (step < 2) {
      setStepError(null);
      setStep((current) => (current + 1) as WizardStep);
      return;
    }

    for (const { step: checkStep } of FORM_STEPS) {
      const checkError = validateStep(checkStep);
      if (checkError) {
        setStepError(checkError);
        setStep(checkStep);
        return;
      }
    }

    setStepError(null);
    onSubmit(form);
  }

  const assignmentSection = (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <FieldLabel required>Impresora</FieldLabel>
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
              searchPlaceholder="Buscar por serial..."
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
          <FieldLabel required>Técnico</FieldLabel>
          <SearchableSelect
            value={form.userId}
            onChange={(userId) =>
              setForm((f) => ({ ...f, userId }))
            }
            options={technicianUserOptions}
            disabled={disabled || lockInspectorField}
            loading={catalogLoading}
            required
            searchPlaceholder="Buscar técnico..."
          />
        </div>
      </div>
    </div>
  );

  const resultSection = (
    <div className="space-y-4">
      <label className="block">
        <FieldLabel>Fecha de inspección</FieldLabel>
        <input
          type="date"
          value={form.inspectionDate}
          disabled={disabled}
          onChange={(e) =>
            setForm((f) => ({ ...f, inspectionDate: e.target.value }))
          }
          className={inputClass}
        />
      </label>

      <fieldset className="space-y-4 rounded-lg border border-border p-4">
        <legend className="px-1 text-sm font-medium text-card-foreground">
          Checklist de inspección
        </legend>
        <p className="text-xs text-muted">
          Seleccione el resultado verificado para cada ítem.
        </p>
        <div className="space-y-4">
          {ANNUAL_INSPECTION_CHECKLIST_ROWS.map((row) => (
            <fieldset key={row.key} disabled={disabled} className="space-y-2">
              <legend className="text-sm font-medium text-card-foreground">
                {row.title}
              </legend>
              <label className="flex items-center gap-3">
                <input
                  id={`${formId}-${row.key}-ok`}
                  type="radio"
                  name={`${formId}-${row.key}`}
                  checked={form.checklist[row.key]}
                  disabled={disabled}
                  onChange={() =>
                    setForm((current) =>
                      setAnnualInspectionChecklistField(current, row.key, true),
                    )
                  }
                  className="size-4 border-border"
                />
                <span className="text-sm text-card-foreground">{row.okLabel}</span>
              </label>
              <label className="flex items-center gap-3">
                <input
                  id={`${formId}-${row.key}-not-ok`}
                  type="radio"
                  name={`${formId}-${row.key}`}
                  checked={!form.checklist[row.key]}
                  disabled={disabled}
                  onChange={() =>
                    setForm((current) =>
                      setAnnualInspectionChecklistField(current, row.key, false),
                    )
                  }
                  className="size-4 border-border"
                />
                <span className="text-sm text-card-foreground">{row.notOkLabel}</span>
              </label>
            </fieldset>
          ))}
        </div>
      </fieldset>

      <label className="block">
        <FieldLabel>Observaciones</FieldLabel>
        <textarea
          rows={FORM_FIELD_TEXTAREA_ROWS}
          value={form.notes}
          disabled={disabled}
          onChange={(e) =>
            setForm((f) => ({ ...f, notes: e.target.value }))
          }
          className={formFieldTextareaClass}
        />
      </label>
    </div>
  );

  function renderWizardSection() {
    if (step === 1) return assignmentSection;
    return resultSection;
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
      <div className="relative flex max-h-[min(92vh,100dvh)] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-border bg-card shadow-xl">
        <div className="shrink-0 border-b border-border px-4 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-card-foreground">
              {mode === "create"
                ? "Nueva inspección anual"
                : "Editar inspección anual"}
            </h2>
            <p className="mt-1 text-sm text-muted">
              {isWizard
                ? stepSubtitle(step)
                : "Documenta la revisión anual con datos técnicos."}
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

          {isWizard && (
            <nav className="mt-4 flex gap-1" aria-label="Pasos del registro">
              {FORM_STEPS.map(({ step: wizardStep, label }) => {
                const Icon = STEP_ICONS[wizardStep];
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
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
          {displayError && (
            <p
              role="alert"
              className="mb-4 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-300"
            >
              {displayError}
            </p>
          )}

          <form id={formId} onSubmit={handleSubmit} className="space-y-5">
            {renderWizardSection()}
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
              Atras
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
                  disabled={saving || catalogLoading}
                  className={cn(
                    "flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground",
                    (saving || catalogLoading) &&
                      "cursor-not-allowed opacity-70",
                  )}
                >
                  {saving && <Loader2 className="size-4 animate-spin" />}
                  {mode === "create"
                    ? "Crear inspeccion anual"
                    : "Guardar inspeccion anual"}
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
