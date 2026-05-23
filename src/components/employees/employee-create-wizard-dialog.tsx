"use client";

import { FormEvent, type ComponentType, useEffect, useId, useMemo, useState } from "react";
import { Link2, Loader2, UserRound, X } from "lucide-react";
import { BranchSelect } from "@/components/users/branch-select";
import { FieldLabel } from "@/components/ui/field-label";
import {
  EMPLOYEE_UI_ROLE_LABELS,
  uiRolesForUser,
  type EmployeeUiRole,
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
  label: string;
  icon: ComponentType<{ className?: string }>;
  subtitle: string;
}[] = [
  {
    step: 1,
    label: "Perfil",
    icon: UserRound,
    subtitle: "Cédula, nombre y datos de contacto del empleado.",
  },
  {
    step: 2,
    label: "Asignación",
    icon: Link2,
    subtitle: "Sucursal y rol operativo para este empleado.",
  },
];

const emptyForm: EmployeeFormValues = {
  nationalId: "",
  name: "",
  phone: "",
  email: "",
  branchId: "",
  role: "administrativo",
};

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
  const disabledProfile = !canEditProfile || saving || branchesLoading;

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setStepError(null);
    if (mode === "edit" && employee) {
      const values = employeeToFormValues(employee);
      setForm(
        roleOptions.includes(values.role)
          ? values
          : { ...values, role: roleOptions[0] ?? "administrativo" },
      );
    } else {
      setForm({
        ...emptyForm,
        role: roleOptions[0] ?? "administrativo",
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
  const selectedBranchDetail = form.branchId
    ? branches.find((b) => String(b.id) === form.branchId)
    : null;

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
    if (!isValidEmail(form.email.trim())) return "El correo no tiene un formato válido.";
    return null;
  }

  function validateAssignment(): string | null {
    if (!form.branchId.trim()) return "Selecciona la sucursal del empleado.";
    if (!canEditRole) return "No tienes permisos para editar el rol.";
    return null;
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

    const assignmentError = validateAssignment();
    if (assignmentError) {
      setStepError(assignmentError);
      return;
    }
    setStepError(null);
    onSubmit(form);
  }

  const inputClass =
    "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-ring/20";

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
              <p className="mt-1 text-sm text-muted">{currentStep.subtitle}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-muted hover:bg-foreground/5"
            >
              <X className="size-5" />
            </button>
          </div>

          <nav className="mt-4 flex gap-1" aria-label="Pasos del empleado">
            {FORM_STEPS.map(({ step: s, label, icon: Icon }) => {
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
          <form id={formId} onSubmit={handleFormSubmit} className="flex h-full flex-col">
            {displayError ? (
              <p
                role="alert"
                className="mb-4 shrink-0 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-300"
              >
                {displayError}
              </p>
            ) : null}

            {step === 1 ? (
              <fieldset
                disabled={disabledProfile}
                className={cn(
                  "space-y-4 rounded-xl border border-border p-4",
                  disabledProfile && "opacity-80",
                )}
              >
                <legend className="px-1 text-sm font-semibold text-card-foreground">
                  Datos personales
                </legend>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block min-w-0">
                    <FieldLabel required={canEditProfile}>
                      Cédula / documento
                    </FieldLabel>
                    <input
                      type="text"
                      required={canEditProfile}
                      value={form.nationalId}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, nationalId: e.target.value }))
                      }
                      className={inputClass}
                    />
                  </label>

                  <label className="block min-w-0">
                    <FieldLabel required={canEditProfile}>Nombre</FieldLabel>
                    <input
                      type="text"
                      required={canEditProfile}
                      value={form.name}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, name: e.target.value }))
                      }
                      className={inputClass}
                    />
                  </label>

                  <label className="block min-w-0">
                    <FieldLabel required={canEditProfile}>Teléfono</FieldLabel>
                    <input
                      type="tel"
                      required={canEditProfile}
                      value={form.phone}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, phone: e.target.value }))
                      }
                      className={inputClass}
                    />
                  </label>
                  <label className="block min-w-0">
                    <FieldLabel required={canEditProfile}>Correo</FieldLabel>
                    <input
                      type="email"
                      required={canEditProfile}
                      value={form.email}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, email: e.target.value }))
                      }
                      className={inputClass}
                    />
                  </label>
                </div>
              </fieldset>
            ) : (
              <fieldset className="space-y-4 rounded-xl border border-border p-4">
                <legend className="px-1 text-sm font-semibold text-card-foreground">
                  Asignación
                </legend>
                <div className="grid gap-4 md:grid-cols-2 md:items-start">
                  <div className="min-w-0">
                    <FieldLabel required={!lockBranch}>Sucursal</FieldLabel>
                    {lockBranch ? (
                      <p className="rounded-lg border border-border bg-foreground/[0.02] px-3 py-2 text-sm text-muted">
                        Sucursal de tu distribuidora (personal interno)
                      </p>
                    ) : (
                      <BranchSelect
                        value={form.branchId}
                        onChange={(branchId) =>
                          setForm((f) => ({ ...f, branchId }))
                        }
                        branches={branches}
                        companies={companies}
                        loading={branchesLoading}
                        disabled={disabledProfile || branches.length === 0}
                      />
                    )}
                    {!lockBranch ? (
                      <p
                        className="mt-1.5 line-clamp-2 min-h-[2.5rem] text-xs text-muted"
                        title={
                          selectedBranchDetail
                            ? `${selectedBranchDetail.city}, ${selectedBranchDetail.state}`
                            : undefined
                        }
                      >
                        {selectedBranchDetail
                          ? `${selectedBranchDetail.city}, ${selectedBranchDetail.state}`
                          : "\u00A0"}
                      </p>
                    ) : null}
                  </div>

                  <label className="block min-w-0">
                    <FieldLabel required>Rol</FieldLabel>
                    <select
                      value={form.role}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          role: e.target.value as EmployeeUiRole,
                        }))
                      }
                      disabled={!canEditRole || saving}
                      className={inputClass}
                    >
                      {roleOptions.map((role) => (
                        <option key={role} value={role}>
                          {EMPLOYEE_UI_ROLE_LABELS[role]}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </fieldset>
            )}
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

