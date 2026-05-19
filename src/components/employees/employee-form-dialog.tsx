"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { FormDialogFooter } from "@/components/ui/form-dialog-footer";
import { BranchSelect } from "@/components/users/branch-select";
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

type EmployeeFormDialogProps = {
  mode: "create" | "edit";
  employee?: EmployeeWithRoles;
  userRole: Role;
  branches: BranchResponse[];
  companies: CompanyResponse[];
  branchesLoading: boolean;
  /** Sucursal por defecto al crear (p. ej. sucursal de la distribuidora). */
  defaultBranchId?: string;
  /** Impide cambiar sucursal (distribuidor con una sola sucursal propia). */
  lockBranch?: boolean;
  open: boolean;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (values: EmployeeFormValues) => void;
  onDelete?: () => void;
  deleting?: boolean;
};

const emptyForm: EmployeeFormValues = {
  nationalId: "",
  name: "",
  phone: "",
  email: "",
  branchId: "",
  role: "administrativo",
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
  onDelete,
  deleting = false,
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

  if (!open) return null;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit(form);
  }

  const inputClass =
    "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-ring/20";
  const disabledProfile = !canEditProfile || saving || branchesLoading;

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
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-xl">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-card-foreground">
              {mode === "create" ? "Nuevo empleado" : "Editar empleado"}
            </h2>
            <p className="mt-1 text-sm text-muted">
              Datos de contacto, sucursal y un único rol.
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <fieldset
            disabled={disabledProfile}
            className={cn("space-y-4", disabledProfile && "opacity-80")}
          >
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">
                Cédula / documento
              </span>
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
              <span className="mb-1.5 block text-sm font-medium">Nombre</span>
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

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">Teléfono</span>
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
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">Correo</span>
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

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">Sucursal</span>
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
            </label>
          </fieldset>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Rol</span>
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

          <FormDialogFooter
            mode={mode}
            saving={saving}
            deleting={deleting}
            submitDisabled={branchesLoading}
            onClose={onClose}
            onDelete={onDelete}
          />
        </form>
      </div>
    </div>
  );
}
