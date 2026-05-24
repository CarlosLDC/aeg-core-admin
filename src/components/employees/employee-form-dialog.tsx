"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { FieldLabel } from "@/components/ui/field-label";
import { FormDialogFooter } from "@/components/ui/form-dialog-footer";
import { BranchSelect } from "@/components/users/branch-select";
import {
  EMPLOYEE_UI_ROLE_LABELS,
  EMPLOYEE_UI_ROLE_STYLES,
  uiRolesForUser,
  type EmployeeUiRole,
  type EmployeeWithRoles,
} from "@/lib/employee-roles";
import {
  employeeToFormValues,
  type EmployeeFormValues,
} from "@/lib/employee-form";
import {
  EMPLOYEE_UI_ROLE_TOGGLE_TONE,
  toggleButtonClass,
} from "@/lib/toggle-button-styles";
import type { BranchResponse } from "@/types/branch";
import type { CompanyResponse } from "@/types/company";
import type { Role } from "@/types/user";
import { cn } from "@/lib/utils";

type EmployeeFormDialogProps = {
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

const emptyForm: EmployeeFormValues = {
  nationalId: "",
  name: "",
  phone: "",
  email: "",
  branchId: "",
  role: "distribuidor",
};

export function EmployeeFormDialog({
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
}: EmployeeFormDialogProps) {
  const [form, setForm] = useState<EmployeeFormValues>(emptyForm);

  const roleOptions = useMemo(() => uiRolesForUser(userRole), [userRole]);
  const canEditProfile = mode === "create" || userRole === "ADMIN";
  const canEditRole = canEditProfile || roleOptions.length > 0;

  useEffect(() => {
    if (!open) return;
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

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit(form);
  }

  function handleRoleChange(role: EmployeeUiRole) {
    setForm((f) => ({ ...f, role }));
  }

  const inputClass =
    "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-ring/20";
  const disabledProfile = !canEditProfile || saving || branchesLoading;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="employee-form-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="Cerrar"
        onClick={onClose}
      />
      <div className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-xl">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2
              id="employee-form-title"
              className="text-lg font-semibold text-card-foreground"
            >
              {mode === "create" ? "Nuevo empleado" : "Editar empleado"}
            </h2>
            <p className="mt-1 text-sm text-muted">
              {mode === "create"
                ? "Define identidad, contacto y asignación operativa del empleado."
                : "Actualiza identidad, contacto y asignación operativa."}
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

        {error && (
          <p
            role="alert"
            className="mb-4 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-300"
          >
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <fieldset
            disabled={disabledProfile}
            className={cn(
              "space-y-4 rounded-xl border border-border p-4",
              disabledProfile && "opacity-80",
            )}
          >
            <legend className="px-1 text-sm font-semibold text-card-foreground">
              Identidad y contacto
            </legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <FieldLabel required={canEditProfile}>Nombre</FieldLabel>
                <input
                  type="text"
                  required={canEditProfile}
                  autoComplete="name"
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="Ej. María Pérez"
                  className={inputClass}
                />
              </label>

              <label className="block">
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

              <label className="block">
                <FieldLabel required={canEditProfile}>Teléfono</FieldLabel>
                <input
                  type="tel"
                  required={canEditProfile}
                  autoComplete="tel"
                  value={form.phone}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, phone: e.target.value }))
                  }
                  className={inputClass}
                />
              </label>

              <label className="block sm:col-span-2">
                <FieldLabel required={canEditProfile}>Correo</FieldLabel>
                <input
                  type="email"
                  required={canEditProfile}
                  autoComplete="email"
                  value={form.email}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, email: e.target.value }))
                  }
                  placeholder="nombre@empresa.com"
                  className={inputClass}
                />
              </label>
            </div>
          </fieldset>

          <fieldset className="space-y-4 rounded-xl border border-border p-4">
            <legend className="px-1 text-sm font-semibold text-card-foreground">
              Asignación operativa
            </legend>
            <div className="grid gap-4 md:grid-cols-2 md:items-start">
              <div className="min-w-0">
                <FieldLabel required={!lockBranch}>Sucursal</FieldLabel>
                {lockBranch ? (
                  <p className="flex h-10 items-center rounded-lg border border-border bg-foreground/[0.03] px-3 text-sm text-muted">
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
              </div>

              <div className="min-w-0">
                <FieldLabel required>Rol</FieldLabel>
                {roleOptions.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted">
                    No tienes permisos para asignar roles operativos.
                  </p>
                ) : roleOptions.length === 1 ? (
                  <div className="flex h-10 w-full items-center rounded-lg border border-border bg-foreground/[0.03] px-3">
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
                        EMPLOYEE_UI_ROLE_STYLES[roleOptions[0]!],
                      )}
                    >
                      {EMPLOYEE_UI_ROLE_LABELS[roleOptions[0]!]}
                    </span>
                  </div>
                ) : (
                  <div
                    className="flex flex-wrap gap-2"
                    role="group"
                    aria-label="Roles disponibles para el empleado"
                  >
                    {roleOptions.map((role) => {
                      const selected = form.role === role;
                      return (
                        <button
                          key={role}
                          type="button"
                          onClick={() => handleRoleChange(role)}
                          aria-pressed={selected}
                          disabled={!canEditRole || saving}
                          className={toggleButtonClass(
                            selected,
                            EMPLOYEE_UI_ROLE_TOGGLE_TONE[role],
                            { disabled: !canEditRole || saving },
                          )}
                        >
                          {EMPLOYEE_UI_ROLE_LABELS[role]}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </fieldset>

          <FormDialogFooter
            mode={mode}
            saving={saving}
            submitDisabled={branchesLoading}
            onClose={onClose}
            createLabel="Crear empleado"
          />
        </form>
      </div>
    </div>
  );
}
