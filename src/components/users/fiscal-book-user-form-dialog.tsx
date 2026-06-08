"use client";

import { FormEvent, useEffect, useState } from "react";
import { X } from "lucide-react";
import { FiscalBookRoleBadge } from "@/components/users/fiscal-book-role-badge";
import { FieldLabel } from "@/components/ui/field-label";
import { FormDialogFooter } from "@/components/ui/form-dialog-footer";
import { PasswordInput } from "@/components/ui/password-input";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import {
  FISCAL_BOOK_ROLE_DESCRIPTIONS,
  FISCAL_BOOK_ROLE_LABELS,
} from "@/lib/fiscal-book-roles";
import { formFieldInputClass } from "@/lib/toggle-button-styles";
import type { EmployeeResponse } from "@/types/employee";
import {
  FISCAL_BOOK_ROLES,
  type FiscalBookRole,
  type FiscalBookUserResponse,
} from "@/types/fiscal-book-user";
import type { FiscalBookUserFormValues } from "@/lib/fiscal-book-user-form";

export type { FiscalBookUserFormValues };

type FiscalBookUserFormDialogProps = {
  mode: "create" | "edit";
  user?: FiscalBookUserResponse;
  employees: EmployeeResponse[];
  employeesLoading: boolean;
  open: boolean;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (values: FiscalBookUserFormValues) => void;
};

const emptyForm: FiscalBookUserFormValues = {
  name: "",
  email: "",
  password: "",
  role: "FISCAL_AUDITOR",
  employeeId: "",
  enabled: true,
};

export function FiscalBookUserFormDialog({
  mode,
  user,
  employees,
  employeesLoading,
  open,
  saving,
  error,
  onClose,
  onSubmit,
}: FiscalBookUserFormDialogProps) {
  const [form, setForm] = useState<FiscalBookUserFormValues>(emptyForm);

  useEffect(() => {
    if (!open) return;
    setForm(
      mode === "edit" && user
        ? {
            name: user.name,
            email: user.email,
            password: "",
            role: user.role,
            employeeId: user.employeeId != null ? String(user.employeeId) : "",
            enabled: user.enabled,
          }
        : emptyForm,
    );
  }, [open, mode, user]);

  if (!open) return null;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onSubmit(form);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-xl"
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-card-foreground">
              {mode === "create"
                ? "Nuevo usuario del libro fiscal"
                : "Editar usuario del libro fiscal"}
            </h2>
            <p className="mt-1 text-sm text-muted">
              Cuenta exclusiva del portal{" "}
              <span className="font-medium">aeg-libros-fiscales</span>.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-muted hover:bg-foreground/5"
            aria-label="Cerrar"
          >
            <X className="size-5" />
          </button>
        </div>

        {error ? (
          <p
            role="alert"
            className="mb-4 rounded-lg border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300"
          >
            {error}
          </p>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <FieldLabel required>Nombre</FieldLabel>
            <input
              className={formFieldInputClass}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </label>

          <label className="block">
            <FieldLabel required>Correo</FieldLabel>
            <input
              type="email"
              className={formFieldInputClass}
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              required
            />
          </label>

          <label className="block">
            <FieldLabel required={mode === "create"}>
              {mode === "create" ? "Contraseña" : "Nueva contraseña"}
            </FieldLabel>
            <PasswordInput
              value={form.password}
              onChange={(password) => setForm((f) => ({ ...f, password }))}
              required={mode === "create"}
              placeholder={mode === "edit" ? "Dejar vacío para no cambiar" : ""}
            />
          </label>

          <div>
            <FieldLabel required>Rol</FieldLabel>
            <SegmentedToggle
              value={form.role}
              onChange={(role: FiscalBookRole) =>
                setForm((f) => ({
                  ...f,
                  role,
                  employeeId: role === "FISCAL_TECHNICIAN" ? f.employeeId : "",
                }))
              }
              options={FISCAL_BOOK_ROLES.map((role) => ({
                value: role,
                label: FISCAL_BOOK_ROLE_LABELS[role],
              }))}
              ariaLabel="Rol del libro fiscal"
            />
            <p className="mt-2 text-sm text-muted">
              {FISCAL_BOOK_ROLE_DESCRIPTIONS[form.role]}
            </p>
            <div className="mt-2">
              <FiscalBookRoleBadge role={form.role} />
            </div>
          </div>

          {form.role === "FISCAL_TECHNICIAN" ? (
            <label className="block">
              <FieldLabel required>Empleado vinculado</FieldLabel>
              <select
                className={formFieldInputClass}
                value={form.employeeId}
                onChange={(e) =>
                  setForm((f) => ({ ...f, employeeId: e.target.value }))
                }
                disabled={employeesLoading}
                required
              >
                <option value="">Seleccionar empleado…</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name} ({employee.nationalId})
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {mode === "edit" ? (
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
          ) : null}

          <FormDialogFooter
            mode={mode}
            onClose={onClose}
            saving={saving}
            createLabel="Crear usuario"
            saveLabel="Guardar cambios"
          />
        </form>
      </div>
    </div>
  );
}
