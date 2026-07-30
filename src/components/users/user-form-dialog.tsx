"use client";

import { FormEvent, useEffect, useId, useMemo, useState } from "react";
import {
  IdCard,
  Loader2,
  Shield,
  UserRound,
  X,
} from "lucide-react";
import { FieldLabel } from "@/components/ui/field-label";
import { PrefixedDocumentInput } from "@/components/ui/prefixed-document-input";
import { FormDialogFooterBar } from "@/components/ui/form-dialog-footer";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { DistributorIdSelect } from "@/components/users/distributor-id-select";
import { PasswordInput } from "@/components/ui/password-input";
import { ROLE_DESCRIPTIONS, ROLE_LABELS } from "@/lib/roles";
import {
  factoryCompanyDisplayLabel,
  findFactoryCompany,
  organizationRoleFromBranch,
} from "@/lib/organization-roles";
import {
  type UserWizardSection,
  validateUserWizardStep,
} from "@/lib/user-form";
import {
  USER_ROLE_TOGGLE_TONE,
  formFieldInputClass,
} from "@/lib/toggle-button-styles";
import { cn } from "@/lib/utils";
import type { BranchResponse } from "@/types/branch";
import type { DistributorResponse } from "@/types/branch-role";
import type { CompanyResponse } from "@/types/company";
import {
  type Role,
  type UserResponse,
} from "@/types/user";

export type UserFormValues = {
  name: string;
  email: string;
  password: string;
  role: Role;
  distributorId: string;
  branchId: string;
  nationalId: string;
  enabled: boolean;
};

type SelectableUserRole = "ADMIN" | "DISTRIBUTOR" | "TECHNICIAN" | "SENIAT";

const USER_FORM_ROLE_OPTIONS: SelectableUserRole[] = [
  "DISTRIBUTOR",
  "TECHNICIAN",
  "ADMIN",
  "SENIAT",
];

const USER_ROLE_COMPACT_LABELS: Record<SelectableUserRole, string> = {
  DISTRIBUTOR: "Distribuidor",
  TECHNICIAN: "Técnico",
  ADMIN: "Admin",
  SENIAT: "SENIAT",
};

type UserFormDialogProps = {
  mode: "create" | "edit";
  user?: UserResponse;
  branches: BranchResponse[];
  companies: CompanyResponse[];
  distributors: DistributorResponse[];
  catalogLoading: boolean;
  open: boolean;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (values: UserFormValues) => void;
};

const emptyForm: UserFormValues = {
  name: "",
  email: "",
  password: "",
  role: "DISTRIBUTOR",
  distributorId: "",
  branchId: "",
  nationalId: "",
  enabled: true,
};

type WizardStep = 1 | 2 | 3;

const FORM_STEPS: {
  step: WizardStep;
  section: UserWizardSection;
  label: string;
}[] = [
  { step: 1, section: "identity", label: "Identidad" },
  { step: 2, section: "role", label: "Rol" },
  { step: 3, section: "assignment", label: "Asignacion" },
];

const STEP_ICONS = {
  1: UserRound,
  2: Shield,
  3: IdCard,
} as const;

const LAST_WIZARD_STEP: WizardStep = 3;

function selectableRole(role: Role): SelectableUserRole {
  if (role === "ADMIN" || role === "SENIAT") return role;
  if (role === "TECHNICIAN" || role === "SERVICE_CENTER") return "TECHNICIAN";
  return "DISTRIBUTOR";
}

function stepSubtitle(step: WizardStep, mode: "create" | "edit"): string {
  switch (step) {
    case 1:
      return mode === "create"
        ? "Define nombre, correo y clave de acceso."
        : "Actualiza nombre, correo y clave (opcional).";
    case 2:
      return "Elige el rol que determina permisos y alcance.";
    case 3:
      return "Completa la vinculacion segun el tipo de usuario.";
    default:
      return "";
  }
}

export function UserFormDialog({
  mode,
  user,
  branches,
  companies,
  distributors,
  catalogLoading,
  open,
  saving,
  error,
  onClose,
  onSubmit,
}: UserFormDialogProps) {
  const formId = useId();
  const [step, setStep] = useState<WizardStep>(1);
  const [stepError, setStepError] = useState<string | null>(null);
  const [form, setForm] = useState<UserFormValues>(emptyForm);
  const selectedRole = selectableRole(form.role);
  const needsDistributorProfile = form.role === "DISTRIBUTOR";
  const needsServiceCenterBranch = form.role === "TECHNICIAN";
  const needsAdminEmployeeProfile = form.role === "ADMIN";
  const needsFieldAssignment =
    needsDistributorProfile ||
    needsServiceCenterBranch ||
    needsAdminEmployeeProfile;
  const factoryCompany = useMemo(
    () => findFactoryCompany(companies),
    [companies],
  );

  const serviceCenterBranchOptions = useMemo(
    () =>
      branches
        .filter(
          (branch) => organizationRoleFromBranch(branch) === "SERVICE_CENTER",
        )
        .map((branch) => {
          const company = companies.find((c) => c.id === branch.companyId);
          const label = company
            ? `${company.businessName} — ${branch.city}, ${branch.state}`
            : `${branch.city}, ${branch.state}`;
          return { value: String(branch.id), label };
        }),
    [branches, companies],
  );

  function handleRoleChange(role: SelectableUserRole) {
    setForm((f) => ({
      ...f,
      role,
      distributorId: role === "DISTRIBUTOR" ? f.distributorId : "",
      branchId: role === "TECHNICIAN" ? f.branchId : "",
      nationalId:
        role === "DISTRIBUTOR" || role === "TECHNICIAN" || role === "ADMIN"
          ? f.nationalId
          : "",
    }));
  }

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && user) {
      setForm({
        name: user.name ?? "",
        email: user.email ?? user.username ?? "",
        password: "",
        role: user.role === "SERVICE_CENTER" ? "TECHNICIAN" : user.role,
        distributorId:
          user.distributorId != null ? String(user.distributorId) : "",
        branchId: user.branchId != null ? String(user.branchId) : "",
        nationalId: user.nationalId ?? "",
        enabled: user.enabled,
      });
    } else {
      setForm(emptyForm);
    }
    setStep(1);
    setStepError(null);
  }, [open, mode, user]);

  if (!open) return null;

  const displayError = stepError ?? error;
  const currentSection =
    FORM_STEPS.find((item) => item.step === step)?.section ?? "identity";

  function validateStep(targetStep: WizardStep): string | null {
    const section =
      FORM_STEPS.find((item) => item.step === targetStep)?.section ??
      "identity";
    return validateUserWizardStep(section, form, mode);
  }

  function goToStep(target: WizardStep) {
    setStepError(null);
    setStep(target);
  }

  function goBack() {
    setStepError(null);
    setStep((current) => Math.max(1, current - 1) as WizardStep);
  }

  function handleStepSubmit(e: FormEvent) {
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

  const identitySection = (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <FieldLabel required>Nombre</FieldLabel>
          <input
            type="text"
            required
            autoComplete="name"
            value={form.name}
            disabled={saving}
            onChange={(e) =>
              setForm((f) => ({ ...f, name: e.target.value }))
            }
            placeholder="Ej. María Pérez"
            className={formFieldInputClass}
          />
        </label>

        <label className="block">
          <FieldLabel required>Correo</FieldLabel>
          <input
            type="email"
            required
            autoComplete="email"
            value={form.email}
            disabled={saving}
            onChange={(e) =>
              setForm((f) => ({ ...f, email: e.target.value }))
            }
            placeholder="nombre@empresa.com"
            className={formFieldInputClass}
          />
        </label>

        <label className="block">
          <FieldLabel required={mode === "create"}>
            Clave
            {mode === "edit" && (
              <span className="font-normal text-muted"> (opcional)</span>
            )}
          </FieldLabel>
          <PasswordInput
            value={form.password}
            onChange={(password) => setForm((f) => ({ ...f, password }))}
            autoComplete={mode === "create" ? "new-password" : "off"}
            required={mode === "create"}
            disabled={saving}
            placeholder={mode === "create" ? "Mínimo 6 caracteres" : ""}
          />
        </label>
      </div>

      {mode === "edit" && (
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.enabled}
            disabled={saving}
            onChange={(e) =>
              setForm((f) => ({ ...f, enabled: e.target.checked }))
            }
            className="size-4 rounded border-border accent-accent"
          />
          <span>Cuenta activa</span>
        </label>
      )}
    </div>
  );

  const roleSection = (
    <div className="space-y-4">
      <SegmentedToggle
        value={selectedRole}
        onChange={handleRoleChange}
        layout="wrap"
        ariaLabel="Rol del usuario"
        disabled={saving}
        options={USER_FORM_ROLE_OPTIONS.map((role) => ({
          value: role,
          label: (
            <>
              <span className="sm:hidden">
                {USER_ROLE_COMPACT_LABELS[role]}
              </span>
              <span className="hidden sm:inline">{ROLE_LABELS[role]}</span>
            </>
          ),
          tone: USER_ROLE_TOGGLE_TONE[role],
        }))}
      />
      <p className="text-xs leading-relaxed text-muted">
        {ROLE_DESCRIPTIONS[selectedRole]}
      </p>
    </div>
  );

  const assignmentSection = (
    <div className="space-y-4">
      {needsFieldAssignment ? (
        <>
          <p className="text-xs text-muted">
            {needsAdminEmployeeProfile
              ? "Los administradores son empleados de la empresa fabricante (AEG)."
              : needsDistributorProfile
                ? "Vincula el usuario a la distribuidora que operará en el panel."
                : "Vincula el técnico a la sucursal del centro de servicio."}
          </p>

          {needsAdminEmployeeProfile && (
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block min-w-0 sm:col-span-2 lg:col-span-1">
                <FieldLabel>Empresa</FieldLabel>
                <input
                  type="text"
                  readOnly
                  disabled
                  value={
                    factoryCompany
                      ? factoryCompanyDisplayLabel(factoryCompany)
                      : "ALPHA ENGINEER GROUP, C.A. — RIF J504594369"
                  }
                  className={`${formFieldInputClass} cursor-not-allowed opacity-80`}
                />
              </label>

              <label className="block min-w-0">
                <FieldLabel required>Cédula</FieldLabel>
                <PrefixedDocumentInput
                  kind="cedula"
                  required
                  value={form.nationalId}
                  disabled={saving || catalogLoading}
                  onChange={(nationalId) =>
                    setForm((f) => ({ ...f, nationalId }))
                  }
                />
              </label>
            </div>
          )}

          {needsDistributorProfile && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="min-w-0 sm:col-span-2 lg:col-span-1">
                <FieldLabel required>Distribuidora</FieldLabel>
                <DistributorIdSelect
                  value={form.distributorId}
                  onChange={(distributorId) =>
                    setForm((f) => ({
                      ...f,
                      role: "DISTRIBUTOR",
                      distributorId,
                      branchId: "",
                    }))
                  }
                  distributors={distributors}
                  branches={branches}
                  companies={companies}
                  loading={catalogLoading}
                  disabled={saving || catalogLoading}
                  required
                />
              </div>

              <label className="block min-w-0">
                <FieldLabel required>Cédula</FieldLabel>
                <PrefixedDocumentInput
                  kind="cedula"
                  required
                  value={form.nationalId}
                  disabled={saving || catalogLoading}
                  onChange={(nationalId) =>
                    setForm((f) => ({ ...f, nationalId }))
                  }
                />
              </label>
            </div>
          )}

          {needsServiceCenterBranch && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="min-w-0 sm:col-span-2 lg:col-span-1">
                <FieldLabel required>Sucursal</FieldLabel>
                <SearchableSelect
                  value={form.branchId}
                  onChange={(branchId) =>
                    setForm((f) => ({
                      ...f,
                      role: "TECHNICIAN",
                      branchId,
                      distributorId: "",
                    }))
                  }
                  options={serviceCenterBranchOptions}
                  disabled={saving || catalogLoading}
                  loading={catalogLoading}
                  required
                  searchPlaceholder="Buscar sucursal..."
                />
              </div>

              <label className="block min-w-0">
                <FieldLabel required>Cédula</FieldLabel>
                <PrefixedDocumentInput
                  kind="cedula"
                  required
                  value={form.nationalId}
                  disabled={saving || catalogLoading}
                  onChange={(nationalId) =>
                    setForm((f) => ({ ...f, nationalId }))
                  }
                />
              </label>
            </div>
          )}

          {needsDistributorProfile &&
            distributors.length === 0 &&
            !catalogLoading && (
              <p className="text-xs text-amber-700 dark:text-amber-300">
                No hay distribuidoras registradas. Asigna el rol de
                distribuidor en Empresas antes de crear usuarios con este
                rol.
              </p>
            )}

          {needsServiceCenterBranch &&
            serviceCenterBranchOptions.length === 0 &&
            !catalogLoading && (
              <p className="text-xs text-amber-700 dark:text-amber-300">
                No hay sucursales aptas para técnicos. Asígnalo en
                Empresas antes de crear este usuario.
              </p>
            )}
        </>
      ) : (
        <p className="rounded-lg border border-border bg-foreground/[0.02] px-3 py-3 text-sm text-muted">
          El rol SENIAT no requiere vinculación a distribuidora ni sucursal.
        </p>
      )}
    </div>
  );

  function renderWizardSection() {
    if (currentSection === "identity") return identitySection;
    if (currentSection === "role") return roleSection;
    return assignmentSection;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="user-form-title"
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
            <div className="min-w-0">
              <h2
                id="user-form-title"
                className="text-lg font-semibold text-card-foreground"
              >
                {mode === "create" ? "Nuevo usuario" : "Editar usuario"}
              </h2>
              <p className="mt-1 text-sm text-muted">
                {stepSubtitle(step, mode)}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-lg p-1.5 text-muted hover:bg-foreground/5"
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

          <form id={formId} onSubmit={handleStepSubmit} className="space-y-5">
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
                    disabled={saving || (needsFieldAssignment && catalogLoading)}
                    className={cn(
                      "flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground",
                      (saving || (needsFieldAssignment && catalogLoading)) &&
                        "cursor-not-allowed opacity-70",
                    )}
                  >
                    {saving && <Loader2 className="size-4 animate-spin" />}
                    {mode === "create" ? "Crear usuario" : "Guardar"}
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
