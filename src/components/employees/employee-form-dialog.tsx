"use client";

import { FormEvent, useEffect, useState } from "react";
import { X } from "lucide-react";
import { CompanySelect } from "@/components/companies/company-select";
import { FieldLabel } from "@/components/ui/field-label";
import { FormDialogFooter } from "@/components/ui/form-dialog-footer";
import type { EmployeeWithRoles } from "@/lib/employee-roles";
import {
  employeeToFormValues,
  type EmployeeFormValues,
} from "@/lib/employee-form";
import { formFieldInputClass } from "@/lib/toggle-button-styles";
import type { BranchResponse } from "@/types/branch";
import type { CompanyResponse } from "@/types/company";
import { cn } from "@/lib/utils";

type EmployeeFormDialogProps = {
  mode: "create" | "edit";
  employee?: EmployeeWithRoles;
  branches?: BranchResponse[];
  companies: CompanyResponse[];
  companiesLoading: boolean;
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
  companyId: "",
};

export function EmployeeFormDialog({
  mode,
  employee,
  branches = [],
  companies,
  companiesLoading,
  open,
  saving,
  error,
  onClose,
  onSubmit,
}: EmployeeFormDialogProps) {
  const [form, setForm] = useState<EmployeeFormValues>(emptyForm);

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && employee) {
      setForm(employeeToFormValues(employee, branches));
    } else {
      setForm(emptyForm);
    }
  }, [open, mode, employee, branches]);

  if (!open) return null;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit(form);
  }

  const inputClass = formFieldInputClass;
  const disabled = saving || companiesLoading;

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
            disabled={disabled}
            className={cn(
              "space-y-4 rounded-xl border border-border p-4",
              disabled && "opacity-80",
            )}
          >
            <legend className="px-1 text-sm font-semibold text-card-foreground">
              Identidad y contacto
            </legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
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
                  className={inputClass}
                />
              </label>

              <label className="block">
                <FieldLabel required>
                  Cédula / documento
                </FieldLabel>
                <input
                  type="text"
                  required
                  value={form.nationalId}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, nationalId: e.target.value }))
                  }
                  className={inputClass}
                />
              </label>

              <label className="block">
                <FieldLabel required>Teléfono</FieldLabel>
                <input
                  type="tel"
                  required
                  autoComplete="tel"
                  value={form.phone}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, phone: e.target.value }))
                  }
                  className={inputClass}
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
                  className={inputClass}
                />
              </label>
            </div>
          </fieldset>

          <fieldset className="space-y-4 rounded-xl border border-border p-4">
            <legend className="px-1 text-sm font-semibold text-card-foreground">
              Empresa
            </legend>
            <CompanySelect
              value={form.companyId}
              onChange={(companyId) => setForm((f) => ({ ...f, companyId }))}
              companies={companies}
              loading={companiesLoading}
              disabled={disabled}
              required
            />
          </fieldset>

          <FormDialogFooter
            mode={mode}
            saving={saving}
            submitDisabled={companiesLoading}
            onClose={onClose}
            createLabel="Crear empleado"
          />
        </form>
      </div>
    </div>
  );
}
