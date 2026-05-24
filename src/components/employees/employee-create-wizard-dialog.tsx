"use client";

import { FormEvent, useEffect, useId, useMemo, useState } from "react";
import { Link2, Loader2, UserRound, X } from "lucide-react";
import {
  EmployeeWizardFields,
  type EmployeeWizardSection,
} from "@/components/employees/employee-wizard-fields";
import {
  uiRolesForUser,
  type EmployeeWithRoles,
} from "@/lib/employee-roles";
import {
  employeeToFormValues,
  type EmployeeFormValues,
} from "@/lib/employee-form";
import type { BranchResponse } from "@/types/branch";
import type { CompanyResponse } from "@/types/company";
import type { Role } from "@/types/user";
import { cn } from "@/lib/utils";

type EmployeeCreateWizardDialogProps = {
  mode: "create" | "edit";
  employee?: EmployeeWithRoles;
  userRole: Role;
  branches: BranchResponse[];
  companies: CompanyResponse[];
  branchesLoading: boolean;
  defaultBranchId?: string;
  lockBranch?: boolean;
  open: boolean;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (values: EmployeeFormValues) => void;
};

type WizardStep = 1 | 2;

const FORM_STEPS: {
  step: WizardStep;
  section: EmployeeWizardSection;
  label: string;
}[] = [
  { step: 1, section: "profile", label: "Perfil" },
  { step: 2, section: "assignment", label: "Asignación" },
];

const STEP_ICONS = {
  1: UserRound,
  2: Link2,
} as const;

const emptyForm: EmployeeFormValues = {
  nationalId: "",
  name: "",
  phone: "",
  email: "",
  branchId: "",
  role: "distribuidor",
};

function stepSubtitle(step: WizardStep): string {
  switch (step) {
    case 1:
      return "Cédula, nombre y datos de contacto del empleado.";
    case 2:
      return "Sucursal y rol operativo para este empleado.";
    default:
      return "";
  }
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function EmployeeCreateWizardDialog({
  mode,
  employee,
  userRole,
  branches,
  companies,
  branchesLoading,
  defaultBranchId = "",
  lockBranch = false,
  open,
  saving,
  error,
  onClose,
  onSubmit,
}: EmployeeCreateWizardDialogProps) {
  const formId = useId();
  const [step, setStep] = useState<WizardStep>(1);
  const [form, setForm] = useState<EmployeeFormValues>(emptyForm);
  const [stepError, setStepError] = useState<string | null>(null);

  const roleOptions = useMemo(() => uiRolesForUser(userRole), [userRole]);
  const canEditProfile = mode === "create" || userRole === "ADMIN";
  const canEditRole = canEditProfile || roleOptions.length > 0;

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setStepError(null);
    if (mode === "edit" && employee) {
      const values = employeeToFormValues(employee);
      setForm(
        roleOptions.includes(values.role)
          ? values
          : { ...values, role: roleOptions[0] ?? "distribuidor" },
      );
    } else {
      setForm({
        ...emptyForm,
        role: roleOptions[0] ?? "distribuidor",
        branchId: defaultBranchId,
      });
    }
  }, [open, mode, employee, roleOptions, defaultBranchId]);

  useEffect(() => {
    if (!open || mode !== "create" || !lockBranch || !defaultBranchId) return;
    setForm((f) =>
      f.branchId === defaultBranchId ? f : { ...f, branchId: defaultBranchId },
    );
  }, [open, mode, lockBranch, defaultBranchId]);

  if (!open) return null;

  const currentStep = FORM_STEPS.find((s) => s.step === step)!;
  const displayError = stepError ?? error;

  function goToStep(target: WizardStep) {
    setStepError(null);
    setStep(target);
  }

  function goBack() {
    setStepError(null);
    setStep((s) => Math.max(1, s - 1) as WizardStep);
  }

  function goNext() {
    setStepError(null);
    setStep((s) => Math.min(2, s + 1) as WizardStep);
  }

  function validateProfile(): string | null {
    if (!canEditProfile) return null;
    if (!form.nationalId.trim()) return "La cédula o documento es obligatorio.";
    if (!form.name.trim()) return "El nombre es obligatorio.";
    if (!form.phone.trim()) return "El teléfono es obligatorio.";
    if (!form.email.trim()) return "El correo es obligatorio.";
    if (!isValidEmail(form.email.trim())) {
      return "El correo no tiene un formato válido.";
    }
    return null;
  }

  function validateAssignment(): string | null {
    if (!form.branchId.trim()) return "Selecciona la sucursal del empleado.";
    if (!canEditRole) return "No tienes permisos para editar el rol.";
    return null;
  }

  function submitRegistration() {
    const profileError = validateProfile();
    if (profileError) {
      setStepError(profileError);
      setStep(1);
      return;
    }
    const assignmentError = validateAssignment();
    if (assignmentError) {
      setStepError(assignmentError);
      setStep(2);
      return;
    }
    setStepError(null);
    onSubmit(form);
  }

  function handleFormSubmit(e: FormEvent) {
    e.preventDefault();
    if (step === 1) {
      const profileError = validateProfile();
      if (profileError) {
        setStepError(profileError);
        return;
      }
      goNext();
      return;
    }
    submitRegistration();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="employee-create-wizard-title"
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
                id="employee-create-wizard-title"
                className="text-lg font-semibold text-card-foreground"
              >
                {mode === "create" ? "Nuevo empleado" : "Editar empleado"}
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
            {displayError ? (
              <p
                role="alert"
                className="mb-4 shrink-0 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-300"
              >
                {displayError}
              </p>
            ) : null}

            <EmployeeWizardFields
              section={currentStep.section}
              form={form}
              setForm={setForm}
              saving={saving}
              branchesLoading={branchesLoading}
              branches={branches}
              companies={companies}
              roleOptions={roleOptions}
              canEditProfile={canEditProfile}
              canEditRole={canEditRole}
              lockBranch={lockBranch}
            />
          </form>
        </div>

        <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-border px-4 py-4 sm:flex-row sm:justify-between sm:px-6 [&_button]:w-full sm:[&_button]:w-auto">
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
                  "inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground",
                  saving && "cursor-not-allowed opacity-70",
                )}
              >
                {saving ? <Loader2 className="size-4 animate-spin" /> : null}
                {mode === "create" ? "Crear empleado" : "Guardar empleado"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
