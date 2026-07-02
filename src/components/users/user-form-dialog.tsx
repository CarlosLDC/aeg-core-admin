"use client";

import { FormEvent, useEffect, useId, useMemo, useState } from "react";
import { X } from "lucide-react";
import { FieldLabel } from "@/components/ui/field-label";
import { PrefixedDocumentInput } from "@/components/ui/prefixed-document-input";
import { FormDialogFooter } from "@/components/ui/form-dialog-footer";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { DistributorIdSelect } from "@/components/users/distributor-id-select";
import { PasswordInput } from "@/components/ui/password-input";
import { ROLE_DESCRIPTIONS, ROLE_LABELS } from "@/lib/roles";
import { organizationRoleFromBranch } from "@/lib/organization-roles";
import {
  USER_ROLE_TOGGLE_TONE,
  formFieldInputClass,
} from "@/lib/toggle-button-styles";
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

function selectableRole(role: Role): SelectableUserRole {
  if (role === "ADMIN" || role === "SENIAT") return role;
  if (role === "TECHNICIAN" || role === "SERVICE_CENTER") return "TECHNICIAN";
  return "DISTRIBUTOR";
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
  const [form, setForm] = useState<UserFormValues>(emptyForm);
  const selectedRole = selectableRole(form.role);
  const needsDistributorProfile = form.role === "DISTRIBUTOR";
  const needsServiceCenterBranch = form.role === "TECHNICIAN";
  const needsFieldAssignment = needsDistributorProfile || needsServiceCenterBranch;

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
        role === "DISTRIBUTOR" || role === "TECHNICIAN" ? f.nationalId : "",
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
  }, [open, mode, user]);

  if (!open) return null;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit(form);
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
                {mode === "create"
                  ? "Completa identidad, rol y asignación según el tipo de usuario."
                  : "Actualiza identidad, credenciales y rol del usuario."}
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
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
          {error && (
            <p
              role="alert"
              className="mb-4 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-300"
            >
              {error}
            </p>
          )}

          <form id={formId} onSubmit={handleSubmit} className="space-y-5">
            <fieldset className="space-y-4 rounded-xl border border-border p-4">
              <legend className="px-1 text-sm font-semibold text-card-foreground">
                Identidad y acceso
              </legend>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block sm:col-span-2">
                  <FieldLabel required>Nombre</FieldLabel>
                  <input
                    type="text"
                    required
                    autoComplete="name"
                    value={form.name}
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
                    placeholder={mode === "create" ? "Mínimo 6 caracteres" : ""}
                  />
                </label>
              </div>
            </fieldset>

            <fieldset className="space-y-4 rounded-xl border border-border p-4">
              <legend className="px-1 text-sm font-semibold text-card-foreground">
                Rol
              </legend>
              <SegmentedToggle
                value={selectedRole}
                onChange={handleRoleChange}
                layout="wrap"
                ariaLabel="Rol del usuario"
                options={USER_FORM_ROLE_OPTIONS.map((role) => ({
                  value: role,
                  label: (
                    <>
                      <span className="sm:hidden">
                        {USER_ROLE_COMPACT_LABELS[role]}
                      </span>
                      <span className="hidden sm:inline">
                        {ROLE_LABELS[role]}
                      </span>
                    </>
                  ),
                  tone: USER_ROLE_TOGGLE_TONE[role],
                }))}
              />
              <p className="text-xs leading-relaxed text-muted">
                {ROLE_DESCRIPTIONS[selectedRole]}
              </p>
            </fieldset>

            {needsFieldAssignment ? (
              <fieldset className="space-y-4 rounded-xl border border-border bg-foreground/[0.02] p-4">
                <legend className="px-1 text-sm font-semibold text-card-foreground">
                  Asignación
                </legend>
                <p className="text-xs text-muted">
                  {needsDistributorProfile
                    ? "Vincula el usuario a la distribuidora que operará en el panel."
                    : "Vincula el técnico a la sucursal del centro de servicio."}
                </p>

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
                        disabled={catalogLoading}
                        required
                      />
                    </div>

                    <label className="block min-w-0">
                      <FieldLabel required>Cédula</FieldLabel>
                      <PrefixedDocumentInput
                        kind="cedula"
                        required
                        value={form.nationalId}
                        disabled={catalogLoading}
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
                        disabled={catalogLoading}
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
                        disabled={catalogLoading}
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
              </fieldset>
            ) : null}

            {mode === "edit" && (
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.enabled}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, enabled: e.target.checked }))
                  }
                  className="size-4 rounded border-border accent-accent"
                />
                <span>Cuenta activa</span>
              </label>
            )}
          </form>
        </div>

        <div className="shrink-0 border-t border-border px-4 py-4 sm:px-6">
          <FormDialogFooter
            mode={mode}
            saving={saving}
            submitDisabled={needsFieldAssignment && catalogLoading}
            onClose={onClose}
            createLabel="Crear usuario"
            formId={formId}
          />
        </div>
      </div>
    </div>
  );
}
