"use client";

import { FormEvent, useEffect, useState } from "react";
import { X } from "lucide-react";
import { FieldLabel } from "@/components/ui/field-label";
import { FormDialogFooter } from "@/components/ui/form-dialog-footer";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import { DistributorIdSelect } from "@/components/users/distributor-id-select";
import { PasswordInput } from "@/components/ui/password-input";
import { ROLE_DESCRIPTIONS } from "@/lib/roles";
import {
  USER_ROLE_TOGGLE_TONE,
  formFieldInputClass,
} from "@/lib/toggle-button-styles";
import type { BranchResponse } from "@/types/branch";
import type { DistributorResponse } from "@/types/branch-role";
import type { CompanyResponse } from "@/types/company";
import type { Role, UserResponse } from "@/types/user";

export type UserFormValues = {
  name: string;
  email: string;
  password: string;
  role: Role;
  distributorId: string;
  nationalId: string;
  enabled: boolean;
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
  role: "TECHNICIAN",
  distributorId: "",
  nationalId: "",
  enabled: true,
};

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
  const [form, setForm] = useState<UserFormValues>(emptyForm);
  const isAdminUser = form.role === "ADMIN";
  const isSeniatUser = form.role === "SENIAT";
  const needsOperationalAssignment = !isAdminUser && !isSeniatUser;
  const accessKind = isAdminUser ? "admin" : isSeniatUser ? "seniat" : "operativo";

  function handleAccessKindChange(kind: "operativo" | "admin" | "seniat") {
    setForm((f) => {
      if (kind === "admin") {
        return {
          ...f,
          role: "ADMIN",
          distributorId: "",
          nationalId: "",
        };
      }
      if (kind === "seniat") {
        return {
          ...f,
          role: "SENIAT",
          distributorId: "",
          nationalId: "",
        };
      }
      return {
        ...f,
        role: "TECHNICIAN",
      };
    });
  }

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && user) {
      setForm({
        name: user.name ?? "",
        email: user.email ?? user.username ?? "",
        password: "",
        role: user.role,
        distributorId:
          user.distributorId != null ? String(user.distributorId) : "",
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
      <div className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-xl">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2
              id="user-form-title"
              className="text-lg font-semibold text-card-foreground"
            >
              {mode === "create" ? "Nuevo usuario" : "Editar usuario"}
            </h2>
            <p className="mt-1 text-sm text-muted">
              {mode === "create"
                ? "Una sola cuenta por usuario: el tipo de acceso define si entra al panel, al libro fiscal o solo a este último."
                : "Actualiza identidad, credenciales y tipo de acceso del usuario."}
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
              Tipo de acceso
            </legend>
            <SegmentedToggle
              value={accessKind}
              onChange={handleAccessKindChange}
              ariaLabel="Tipo de acceso"
              options={[
                {
                  value: "operativo",
                  label: "Usuario operativo",
                  tone: USER_ROLE_TOGGLE_TONE.TECHNICIAN,
                },
                {
                  value: "admin",
                  label: "Administrador",
                  tone: USER_ROLE_TOGGLE_TONE.ADMIN,
                },
                {
                  value: "seniat",
                  label: "Auditor SENIAT",
                  tone: USER_ROLE_TOGGLE_TONE.SENIAT,
                },
              ]}
            />
            <p className="text-xs text-muted">
              {isAdminUser
                ? ROLE_DESCRIPTIONS.ADMIN
                : isSeniatUser
                  ? ROLE_DESCRIPTIONS.SENIAT
                  : ROLE_DESCRIPTIONS.TECHNICIAN}
            </p>
          </fieldset>

          {needsOperationalAssignment && (
            <fieldset className="space-y-4 rounded-xl border border-border p-4">
              <legend className="px-1 text-sm font-semibold text-card-foreground">
                Asignación operativa
              </legend>
              <div className="grid gap-4 md:grid-cols-2 md:items-start">
                <div className="min-w-0">
                  <FieldLabel required>Distribuidora</FieldLabel>
                  <DistributorIdSelect
                    value={form.distributorId}
                    onChange={(distributorId) =>
                      setForm((f) => ({ ...f, distributorId }))
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
                  <input
                    type="text"
                    required
                    value={form.nationalId}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, nationalId: e.target.value }))
                    }
                    placeholder="Ej. V-12345678"
                    className={formFieldInputClass}
                  />
                </label>
              </div>

              {distributors.length === 0 && !catalogLoading && (
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  No hay distribuidoras registradas. Asigna el rol de distribuidor
                  en Empresas antes de crear usuarios técnicos.
                </p>
              )}
            </fieldset>
          )}

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

          <FormDialogFooter
            mode={mode}
            saving={saving}
            submitDisabled={needsOperationalAssignment && catalogLoading}
            onClose={onClose}
            createLabel="Crear usuario"
          />
        </form>
      </div>
    </div>
  );
}
