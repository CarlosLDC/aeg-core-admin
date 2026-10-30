"use client";

import { FormEvent, useEffect, useId, useState } from "react";
import {
  AppWindow,
  Building2,
  Check,
  Code2,
  Cpu,
  Loader2,
  Monitor,
  Plus,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import { CompanySelect } from "@/components/companies/company-select";
import { BooleanToggle } from "@/components/ui/boolean-toggle";
import { FieldLabel } from "@/components/ui/field-label";
import { FormDialogFooterBar } from "@/components/ui/form-dialog-footer";
import { PrefixedDocumentInput } from "@/components/ui/prefixed-document-input";
import { normalizeRif, RIF_PATTERN } from "@/lib/seniat-extract";
import {
  COMMON_OPERATING_SYSTEMS,
  COMMON_PROGRAMMING_LANGUAGES,
  INITIAL_SOFTWARE_FORM_VALUES,
  softwareToFormValues,
  type SoftwareFormValues,
} from "@/lib/software-form";
import {
  formFieldInputClass,
  toggleButtonClass,
} from "@/lib/toggle-button-styles";
import { cn } from "@/lib/utils";
import type { CompanyResponse } from "@/types/company";
import type { SoftwareResponse } from "@/types/software";

type SoftwareFormDialogProps = {
  mode: "create" | "edit";
  software?: SoftwareResponse;
  open: boolean;
  saving: boolean;
  error: string | null;
  companies: CompanyResponse[];
  onClose: () => void;
  onSubmit: (values: SoftwareFormValues) => void;
};

type WizardStep = 1 | 2 | 3;
type WizardSection = "general" | "technical" | "distributors";

const FORM_STEPS: {
  step: WizardStep;
  section: WizardSection;
  label: string;
}[] = [
  { step: 1, section: "general", label: "Identificación" },
  { step: 2, section: "technical", label: "Tecnología" },
  { step: 3, section: "distributors", label: "Distribuidores" },
];

const STEP_ICONS = {
  1: AppWindow,
  2: Cpu,
  3: Building2,
} as const;

const LAST_WIZARD_STEP: WizardStep = 3;

function stepSubtitle(step: WizardStep): string {
  switch (step) {
    case 1:
      return "Indica el nombre, la versión, el tipo de desarrollo y el fabricante.";
    case 2:
      return "Selecciona los lenguajes de programación y sistemas operativos.";
    case 3:
      return "Asocia las empresas autorizadas para distribuir este software.";
    default:
      return "";
  }
}

export function SoftwareFormDialog({
  mode,
  software,
  open,
  saving,
  error,
  companies,
  onClose,
  onSubmit,
}: SoftwareFormDialogProps) {
  const formId = useId();
  const titleId = useId();
  const [step, setStep] = useState<WizardStep>(1);
  const [form, setForm] = useState<SoftwareFormValues>(
    INITIAL_SOFTWARE_FORM_VALUES,
  );
  const [stepError, setStepError] = useState<string | null>(null);
  const [customLanguage, setCustomLanguage] = useState("");
  const [availableLanguages, setAvailableLanguages] = useState<string[]>(
    () => [...COMMON_PROGRAMMING_LANGUAGES],
  );
  const [selectedDistributorToAdd, setSelectedDistributorToAdd] = useState("");

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && software) {
      setForm(softwareToFormValues(software));
      setAvailableLanguages(
        Array.from(
          new Set([
            ...COMMON_PROGRAMMING_LANGUAGES,
            ...(software.programmingLanguages ?? []),
          ]),
        ),
      );
    } else {
      setForm(INITIAL_SOFTWARE_FORM_VALUES);
      setAvailableLanguages([...COMMON_PROGRAMMING_LANGUAGES]);
    }
    setStep(1);
    setStepError(null);
    setCustomLanguage("");
    setSelectedDistributorToAdd("");
  }, [open, mode, software]);

  if (!open) return null;

  function validateStep(targetStep: WizardStep): string | null {
    if (targetStep === 1) {
      if (!form.name.trim()) {
        return "El nombre del software es obligatorio.";
      }
      if (!form.version.trim()) {
        return "La versión del software es obligatoria.";
      }
      if (form.external) {
        const rawRif = form.developerRif.trim();
        if (rawRif && !RIF_PATTERN.test(normalizeRif(rawRif))) {
          return "El RIF del desarrollador debe tener formato válido (ej. J-123456789).";
        }
      }
      return null;
    }
    return null;
  }

  function goToStep(target: WizardStep) {
    if (saving) return;
    setStepError(null);
    setStep(target);
  }

  function goBack() {
    if (saving || step === 1) return;
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

  function toggleLanguage(lang: string) {
    setForm((prev) => {
      const exists = prev.programmingLanguages.includes(lang);
      return {
        ...prev,
        programmingLanguages: exists
          ? prev.programmingLanguages.filter((l) => l !== lang)
          : [...prev.programmingLanguages, lang],
      };
    });
  }

  function removeLanguage(lang: string) {
    setForm((prev) => ({
      ...prev,
      programmingLanguages: prev.programmingLanguages.filter((l) => l !== lang),
    }));
  }

  function addCustomLanguage() {
    const val = customLanguage.trim();
    if (!val) return;
    setAvailableLanguages((prev) =>
      prev.includes(val) ? prev : [...prev, val],
    );
    setForm((prev) => ({
      ...prev,
      programmingLanguages: prev.programmingLanguages.includes(val)
        ? prev.programmingLanguages
        : [...prev.programmingLanguages, val],
    }));
    setCustomLanguage("");
  }

  function deleteLanguageOption(lang: string) {
    setAvailableLanguages((prev) => prev.filter((l) => l !== lang));
    setForm((prev) => ({
      ...prev,
      programmingLanguages: prev.programmingLanguages.filter((l) => l !== lang),
    }));
  }

  function resetDefaultLanguages() {
    setAvailableLanguages(
      Array.from(
        new Set([
          ...COMMON_PROGRAMMING_LANGUAGES,
          ...form.programmingLanguages,
        ]),
      ),
    );
  }

  function toggleOs(os: string) {
    setForm((prev) => {
      const exists = prev.operatingSystems.includes(os);
      return {
        ...prev,
        operatingSystems: exists
          ? prev.operatingSystems.filter((o) => o !== os)
          : [...prev.operatingSystems, os],
      };
    });
  }

  function addDistributorCompany(companyIdStr: string) {
    const id = Number(companyIdStr);
    if (!id || Number.isNaN(id)) return;
    if (!form.distributorCompanyIds.includes(id)) {
      setForm((prev) => ({
        ...prev,
        distributorCompanyIds: [...prev.distributorCompanyIds, id],
      }));
    }
    setSelectedDistributorToAdd("");
  }

  function removeDistributorCompany(id: number) {
    setForm((prev) => ({
      ...prev,
      distributorCompanyIds: prev.distributorCompanyIds.filter(
        (cid) => cid !== id,
      ),
    }));
  }

  const selectedDistributors = form.distributorCompanyIds
    .map((id) => companies.find((c) => c.id === id))
    .filter((c): c is CompanyResponse => c != null);

  const availableDistributorCompanies = companies.filter(
    (c) => !form.distributorCompanyIds.includes(c.id),
  );

  const displayError = stepError ?? error;
  const currentSection =
    FORM_STEPS.find((item) => item.step === step)?.section ?? "general";

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
        disabled={saving}
        onClick={onClose}
      />
      <div
        className={cn(
          "relative flex max-h-[min(92vh,100dvh)] w-full flex-col overflow-hidden rounded-xl border border-border bg-card shadow-xl transition-[max-width] duration-200 ease-out",
          currentSection === "technical" ? "max-w-3xl" : "max-w-2xl",
        )}
      >
        <div className="shrink-0 border-b border-border px-4 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2
                id={titleId}
                className="text-lg font-semibold text-card-foreground"
              >
                {mode === "create" ? "Nuevo software" : "Editar software"}
              </h2>
              <p className="mt-1 text-sm text-muted">{stepSubtitle(step)}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="shrink-0 rounded-lg p-1.5 text-muted hover:bg-foreground/5 disabled:opacity-50"
              aria-label="Cerrar"
            >
              <X className="size-5" />
            </button>
          </div>

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

          <form id={formId} onSubmit={handleSubmit} className="space-y-4">
            {currentSection === "general" && (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <FieldLabel required>Nombre del software</FieldLabel>
                    <input
                      type="text"
                      required
                      disabled={saving}
                      value={form.name}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, name: e.target.value }))
                      }
                      placeholder="Ej. Saint Enterprise, A2, Valery…"
                      className={formFieldInputClass}
                    />
                  </label>
                  <label className="block">
                    <FieldLabel required>Versión</FieldLabel>
                    <input
                      type="text"
                      required
                      disabled={saving}
                      value={form.version}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, version: e.target.value }))
                      }
                      placeholder="Ej. 1.0, 2.5.4…"
                      className={cn(formFieldInputClass, "font-mono")}
                    />
                  </label>
                </div>

                <div>
                  <FieldLabel>Tipo de desarrollo</FieldLabel>
                  <BooleanToggle
                    value={form.external}
                    onChange={(external) =>
                      setForm((f) => ({ ...f, external }))
                    }
                    disabled={saving}
                    falseLabel="Propio (AEG)"
                    trueLabel="Terceros"
                    falseTone="emerald"
                    trueTone="amber"
                    ariaLabel="Tipo de desarrollo"
                  />
                </div>

                {form.external && (
                  <div className="grid gap-4 sm:grid-cols-2 pt-1 animate-in fade-in duration-200">
                    <label className="block">
                      <FieldLabel>Empresa desarrolladora</FieldLabel>
                      <input
                        type="text"
                        disabled={saving}
                        value={form.developerName}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            developerName: e.target.value,
                          }))
                        }
                        placeholder="Ej. Saint de Venezuela C.A.…"
                        className={formFieldInputClass}
                      />
                    </label>
                    <label className="block">
                      <FieldLabel>RIF desarrollador</FieldLabel>
                      <PrefixedDocumentInput
                        kind="rif"
                        disabled={saving}
                        value={form.developerRif}
                        onChange={(developerRif) =>
                          setForm((f) => ({ ...f, developerRif }))
                        }
                      />
                    </label>
                  </div>
                )}
              </div>
            )}

            {currentSection === "technical" && (
              <div className="space-y-6">
                {/* Panel Lenguajes de programación */}
                <div className="space-y-5 rounded-xl border border-border bg-card/40 p-5">
                  <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
                        <Code2 className="size-5" aria-hidden />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-card-foreground">
                          Lenguajes de programación
                        </h3>
                        <p className="text-sm text-muted">
                          Define los lenguajes utilizados o añade nuevos al catálogo.
                        </p>
                      </div>
                    </div>
                    {form.programmingLanguages.length > 0 && (
                      <span className="shrink-0 rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-0.5 text-xs font-medium text-sky-700 dark:text-sky-300">
                        {form.programmingLanguages.length}{" "}
                        {form.programmingLanguages.length === 1
                          ? "seleccionado"
                          : "seleccionados"}
                      </span>
                    )}
                  </div>

                  {/* Lenguajes seleccionados */}
                  <div className="space-y-2">
                    <span className="block text-sm font-medium text-card-foreground">
                      Lenguajes asignados
                    </span>
                    {form.programmingLanguages.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {form.programmingLanguages.map((lang) => (
                          <span
                            key={lang}
                            className="inline-flex items-center gap-2 rounded-lg border border-sky-500/35 bg-sky-500/10 px-3 py-1.5 text-sm font-medium text-sky-700 dark:text-sky-300"
                          >
                            <span>{lang}</span>
                            <button
                              type="button"
                              disabled={saving}
                              onClick={() => removeLanguage(lang)}
                              className="inline-flex size-4 items-center justify-center rounded-full text-sky-700/70 hover:bg-rose-500/15 hover:text-rose-600 dark:text-sky-300/70 dark:hover:text-rose-400 transition-colors"
                              title={`Quitar ${lang}`}
                              aria-label={`Quitar ${lang}`}
                            >
                              <X className="size-3.5" aria-hidden />
                            </button>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="rounded-lg border border-dashed border-border/80 bg-foreground/[0.02] px-4 py-3 text-sm text-muted">
                        No hay lenguajes asignados todavía. Elige de las sugerencias abajo o escribe uno nuevo.
                      </p>
                    )}
                  </div>

                  {/* Añadir nuevo lenguaje */}
                  <div className="space-y-2 pt-1">
                    <span className="block text-sm font-medium text-card-foreground">
                      Añadir nuevo lenguaje
                    </span>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        disabled={saving}
                        value={customLanguage}
                        onChange={(e) => setCustomLanguage(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addCustomLanguage();
                          }
                        }}
                        placeholder="Ej. Rust, Go, Cobol…"
                        className={cn(formFieldInputClass, "flex-1 text-sm")}
                      />
                      <button
                        type="button"
                        onClick={addCustomLanguage}
                        disabled={saving || !customLanguage.trim()}
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-card-foreground transition-colors hover:bg-foreground/5 disabled:opacity-50"
                      >
                        <Plus className="size-4" />
                        Añadir
                      </button>
                    </div>
                  </div>

                  {/* Catálogo de opciones disponibles */}
                  <div className="space-y-2.5 pt-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-muted">
                        Sugerencias y opciones disponibles
                      </span>
                      {availableLanguages.length < COMMON_PROGRAMMING_LANGUAGES.length && (
                        <button
                          type="button"
                          disabled={saving}
                          onClick={resetDefaultLanguages}
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:underline disabled:opacity-50"
                        >
                          <RotateCcw className="size-3.5" />
                          Restaurar sugerencias
                        </button>
                      )}
                    </div>
                    {availableLanguages.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {availableLanguages.map((lang) => {
                          const active = form.programmingLanguages.includes(lang);
                          return (
                            <div
                              key={lang}
                              className={cn(
                                "group inline-flex items-center rounded-lg border text-sm font-medium transition-colors",
                                active
                                  ? "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300"
                                  : "border-border bg-background text-muted hover:border-foreground/20 hover:text-card-foreground",
                              )}
                            >
                              <button
                                type="button"
                                disabled={saving}
                                aria-pressed={active}
                                onClick={() => toggleLanguage(lang)}
                                className="inline-flex items-center gap-2 px-3 py-1.5 focus:outline-none"
                              >
                                {active && (
                                  <Check className="size-3.5 shrink-0 text-sky-600 dark:text-sky-400" />
                                )}
                                <span>{lang}</span>
                              </button>
                              <button
                                type="button"
                                disabled={saving}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteLanguageOption(lang);
                                }}
                                className="inline-flex size-7 items-center justify-center rounded-r-lg text-muted/60 opacity-60 hover:opacity-100 hover:bg-rose-500/15 hover:text-rose-600 dark:hover:text-rose-400 transition-all focus:outline-none focus:opacity-100 pr-1.5"
                                title={`Eliminar ${lang} de la lista`}
                                aria-label={`Eliminar ${lang} de la lista`}
                              >
                                <X className="size-3.5" aria-hidden />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="rounded-lg border border-dashed border-border/80 bg-foreground/[0.02] px-4 py-3 text-center text-sm text-muted">
                        No hay opciones en la lista. Puedes añadir nuevas arriba o restaurar las sugerencias.
                      </p>
                    )}
                  </div>
                </div>

                {/* Panel Sistemas operativos */}
                <div className="space-y-5 rounded-xl border border-border bg-card/40 p-5">
                  <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
                        <Monitor className="size-5" aria-hidden />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-card-foreground">
                          Sistemas operativos
                        </h3>
                        <p className="text-sm text-muted">
                          Plataformas y entornos compatibles con el software.
                        </p>
                      </div>
                    </div>
                    {form.operatingSystems.length > 0 && (
                      <span className="shrink-0 rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-0.5 text-xs font-medium text-sky-700 dark:text-sky-300">
                        {form.operatingSystems.length}{" "}
                        {form.operatingSystems.length === 1
                          ? "seleccionado"
                          : "seleccionados"}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    {COMMON_OPERATING_SYSTEMS.map((os) => {
                      const active = form.operatingSystems.includes(os);
                      return (
                        <button
                          key={os}
                          type="button"
                          disabled={saving}
                          aria-pressed={active}
                          onClick={() => toggleOs(os)}
                          className={cn(
                            toggleButtonClass(active, "sky"),
                            "inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium",
                          )}
                        >
                          {active && (
                            <Check className="size-3.5 shrink-0 text-sky-600 dark:text-sky-400" />
                          )}
                          <span>{os}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {currentSection === "distributors" && (
              <div className="space-y-4">
                <div>
                  <FieldLabel>Distribuidores autorizados</FieldLabel>
                  <CompanySelect
                    value={selectedDistributorToAdd}
                    onChange={addDistributorCompany}
                    companies={availableDistributorCompanies}
                    disabled={saving}
                  />
                </div>

                {selectedDistributors.length > 0 ? (
                  <div className="space-y-2">
                    {selectedDistributors.map((d) => (
                      <div
                        key={d.id}
                        className="flex items-center justify-between gap-2.5 rounded-lg border border-border bg-background p-2.5"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-card-foreground">
                            {d.businessName || d.rif}
                          </p>
                          <p className="font-mono text-xs text-muted">
                            {d.rif}
                          </p>
                        </div>
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => removeDistributorCompany(d.id)}
                          className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-rose-500/10 hover:text-rose-600 disabled:opacity-50"
                          aria-label={`Quitar distribuidor ${d.businessName || d.rif}`}
                        >
                          <Trash2 className="size-4" aria-hidden />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-lg border border-dashed border-border bg-foreground/[0.02] px-4 py-6 text-center text-sm text-muted">
                    No hay distribuidores seleccionados para este software.
                  </p>
                )}
              </div>
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
                  disabled={saving}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-muted hover:bg-foreground/5 disabled:opacity-50"
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
                    disabled={saving}
                    className={cn(
                      "flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground",
                      saving && "cursor-not-allowed opacity-70",
                    )}
                  >
                    {saving && <Loader2 className="size-4 animate-spin" />}
                    {mode === "create" ? "Crear" : "Guardar"}
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
