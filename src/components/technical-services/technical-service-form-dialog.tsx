"use client";

import { FormEvent, useEffect, useId, useState } from "react";
import {
  ClipboardCheck,
  ClipboardList,
  FileText,
  Link2,
  Loader2,
  ShieldAlert,
  X,
} from "lucide-react";
import { BooleanToggle } from "@/components/ui/boolean-toggle";
import { FieldLabel } from "@/components/ui/field-label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import type { SearchableSelectOption } from "@/components/ui/searchable-select";
import {
  FORM_FIELD_TEXTAREA_ROWS,
  SEAL_TAMPERED_TOGGLE_TONE,
  formFieldTextareaClass,
} from "@/lib/toggle-button-styles";
import {
  emptyTechnicalServiceForm,
  technicalServiceToFormValues,
  type TechnicalServiceFormValues,
} from "@/lib/technical-service-form";
import type { TechnicalServiceResponse } from "@/types/technical-service";
import type { Role } from "@/types/user";
import { formFieldInputClass } from "@/lib/toggle-button-styles";
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
  technicianUserOptions: SearchableSelectOption[];
  currentUserRole?: Role;
  currentUserId?: number | null;
  sealOptions: SearchableSelectOption[];
  serviceCenterOptions: SearchableSelectOption[];
  distributorOptions: SearchableSelectOption[];
  onClose: () => void;
  onSubmit: (values: TechnicalServiceFormValues) => void;
};

type WizardStep = 1 | 2 | 3 | 4 | 5;
type WizardSection =
  | "assignment"
  | "visit"
  | "outcome"
  | "zReports"
  | "seals";

const FORM_STEPS: { step: WizardStep; section: WizardSection; label: string }[] = [
  { step: 1, section: "assignment", label: "Asignacion" },
  { step: 2, section: "visit", label: "Visita" },
  { step: 3, section: "outcome", label: "Resultado" },
  { step: 4, section: "zReports", label: "Reportes Z" },
  { step: 5, section: "seals", label: "Precintos" },
];

const STEP_ICONS = {
  1: Link2,
  2: ClipboardList,
  3: ClipboardCheck,
  4: FileText,
  5: ShieldAlert,
} as const;

const LAST_WIZARD_STEP: WizardStep = 5;

function stepSubtitle(step: WizardStep): string {
  switch (step) {
    case 1:
      return "Selecciona impresora, tecnico y responsables del servicio.";
    case 2:
      return "Registra tiempos, solicitud, costo y falla reportada.";
    case 3:
      return "Indica observaciones y si el precinto fue violentado.";
    case 4:
      return "Completa los reportes Z inicial y final.";
    case 5:
      return "Asocia precintos instalados o retirados.";
    default:
      return "";
  }
}

function hasValue(value: string): boolean {
  return value.trim().length > 0;
}

export function TechnicalServiceFormDialog({
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
  sealOptions,
  serviceCenterOptions,
  distributorOptions,
  onClose,
  onSubmit,
}: TechnicalServiceFormDialogProps) {
  const formId = useId();
  const isWizard = true;
  const lockTechnicianField =
    mode === "create" && currentUserRole === "TECHNICIAN" && currentUserId != null;
  const [step, setStep] = useState<WizardStep>(1);
  const [stepError, setStepError] = useState<string | null>(null);
  const [form, setForm] = useState<TechnicalServiceFormValues>(
    emptyTechnicalServiceForm(),
  );

  useEffect(() => {
    if (!open) return;
    const base =
      mode === "edit" && row
        ? technicalServiceToFormValues(row)
        : emptyTechnicalServiceForm();
    if (lockTechnicianField && currentUserId != null) {
      base.userId = String(currentUserId);
    }
    setForm(base);
    setStep(1);
    setStepError(null);
  }, [open, mode, row, lockTechnicianField, currentUserId]);

  if (!open) return null;

  const inputClass = formFieldInputClass;
  const disabled = saving || catalogLoading;
  const sectionClass = "space-y-4";
  const displayError = stepError ?? error;

  function validateStep(targetStep: WizardStep): string | null {
    if (targetStep === 1) {
      if (!hasValue(form.printerId)) return "Selecciona una impresora.";
      if (!hasValue(form.userId)) return "Selecciona un tecnico.";
      return null;
    }

    if (targetStep === 2) {
      if (!hasValue(form.startAt)) return "Indica la fecha de inicio.";
      if (!hasValue(form.endAt)) return "Indica la fecha de fin.";
      if (!hasValue(form.requestDate)) {
        return "Indica la fecha de solicitud.";
      }
      if (!hasValue(form.cost)) return "Indica el costo del servicio.";
      if (!hasValue(form.reportedFailure)) {
        return "Describe la falla reportada.";
      }
      return null;
    }

    if (targetStep === 3) {
      if (form.sealTampered === null) {
        return "Indica si el precinto fue violentado.";
      }
      if (!hasValue(form.notes)) return "Indica las observaciones.";
      return null;
    }

    if (targetStep === 4) {
      if (!hasValue(form.initialZReport)) {
        return "Indica el reporte Z inicial.";
      }
      if (!hasValue(form.finalZReport)) return "Indica el reporte Z final.";
      if (!hasValue(form.initialZDate)) {
        return "Indica la fecha del Z inicial.";
      }
      if (!hasValue(form.finalZDate)) return "Indica la fecha del Z final.";
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

  function handleCreateStepSubmit(e: FormEvent) {
    e.preventDefault();

    const currentError = validateStep(step);
    if (currentError) {
      setStepError(currentError);
      return;
    }

    if (step < LAST_WIZARD_STEP) {
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
    <div className={sectionClass}>
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
            disabled={disabled || lockTechnicianField}
            loading={catalogLoading}
            required
            searchPlaceholder="Buscar tecnico..."
          />
        </div>
        <div>
          <FieldLabel>Centro de servicio</FieldLabel>
          <SearchableSelect
            value={form.serviceCenterId}
            onChange={(serviceCenterId) =>
              setForm((f) => ({ ...f, serviceCenterId }))
            }
            options={serviceCenterOptions}
            disabled={disabled}
            loading={catalogLoading}
            searchPlaceholder="Buscar centro..."
          />
        </div>
        <div>
          <FieldLabel>Distribuidor</FieldLabel>
          <SearchableSelect
            value={form.distributorId}
            onChange={(distributorId) =>
              setForm((f) => ({ ...f, distributorId }))
            }
            options={distributorOptions}
            disabled={disabled}
            loading={catalogLoading}
            searchPlaceholder="Buscar distribuidor..."
          />
        </div>
      </div>
    </div>
  );

  const visitSection = (
    <div className={sectionClass}>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <FieldLabel required>Inicio</FieldLabel>
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
          <FieldLabel required>Fin</FieldLabel>
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
          <FieldLabel required>Fecha solicitud</FieldLabel>
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
          <FieldLabel required>Costo</FieldLabel>
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
        <FieldLabel required>Falla reportada</FieldLabel>
        <textarea
          required
          rows={FORM_FIELD_TEXTAREA_ROWS}
          value={form.reportedFailure}
          disabled={disabled}
          onChange={(e) =>
            setForm((f) => ({ ...f, reportedFailure: e.target.value }))
          }
          className={formFieldTextareaClass}
        />
      </label>
    </div>
  );

  const outcomeSection = (
    <div className={sectionClass}>
      <div className="block">
        <FieldLabel required>Precinto violentado</FieldLabel>
        <BooleanToggle
          value={form.sealTampered}
          onChange={(sealTampered) =>
            setForm((f) => ({ ...f, sealTampered }))
          }
          disabled={disabled}
          falseLabel="Intacto"
          trueLabel="Violentado"
          falseTone={SEAL_TAMPERED_TOGGLE_TONE.false}
          trueTone={SEAL_TAMPERED_TOGGLE_TONE.true}
          ariaLabel="Estado del precinto"
        />
      </div>
      <label className="block">
        <FieldLabel required>Observaciones</FieldLabel>
        <textarea
          required
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

  const zReportsSection = (
    <div className={sectionClass}>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <FieldLabel required>Z inicial</FieldLabel>
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
          <FieldLabel required>Z final</FieldLabel>
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
          <FieldLabel required>Fecha Z inicial</FieldLabel>
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
          <FieldLabel required>Fecha Z final</FieldLabel>
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
    </div>
  );

  const sealsSection = (
    <div className={sectionClass}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <FieldLabel>Instalado</FieldLabel>
          <SearchableSelect
            value={form.installedSealId}
            onChange={(installedSealId) =>
              setForm((f) => ({ ...f, installedSealId }))
            }
            options={sealOptions}
            disabled={disabled}
            loading={catalogLoading}
            searchPlaceholder="Buscar precinto..."
            mono
          />
        </div>
        <div>
          <FieldLabel>Retirado</FieldLabel>
          <SearchableSelect
            value={form.removedSealId}
            onChange={(removedSealId) =>
              setForm((f) => ({ ...f, removedSealId }))
            }
            options={sealOptions}
            disabled={disabled}
            loading={catalogLoading}
            searchPlaceholder="Buscar precinto..."
            mono
          />
        </div>
      </div>
    </div>
  );

  function renderWizardSection() {
    const currentSection = FORM_STEPS.find((item) => item.step === step)?.section;
    if (currentSection === "assignment") return assignmentSection;
    if (currentSection === "visit") return visitSection;
    if (currentSection === "outcome") return outcomeSection;
    if (currentSection === "zReports") return zReportsSection;
    return sealsSection;
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
      <div className="relative flex max-h-[min(92vh,100dvh)] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-border bg-card shadow-xl">
        <div className="shrink-0 border-b border-border px-4 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-card-foreground">
                {mode === "create" ? "Nuevo servicio tecnico" : "Editar servicio tecnico"}
              </h2>
              <p className="mt-1 text-sm text-muted">
                {isWizard
                  ? stepSubtitle(step)
                  : "Visita de servicio con reportes Z y precintos."}
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

          <form id={formId} onSubmit={handleCreateStepSubmit} className="space-y-5">
            {renderWizardSection()}
          </form>
        </div>

        <div className="shrink-0 border-t border-border px-4 py-4 sm:px-6">
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
              {step < LAST_WIZARD_STEP ? (
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
                    (saving || catalogLoading) && "cursor-not-allowed opacity-70",
                  )}
                >
                  {saving && <Loader2 className="size-4 animate-spin" />}
                  {mode === "create"
                    ? "Crear servicio tecnico"
                    : "Guardar servicio tecnico"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
