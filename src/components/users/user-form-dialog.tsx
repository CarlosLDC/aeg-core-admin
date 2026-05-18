"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { formatBranchLabel } from "@/lib/branches";
import { X } from "lucide-react";
import { FormDialogFooter } from "@/components/ui/form-dialog-footer";
import { BranchSelect } from "@/components/users/branch-select";
import { DistributorIdSelect } from "@/components/users/distributor-id-select";
import { PasswordInput } from "@/components/ui/password-input";
import {
  isUserRoleAssignable,
  ROLE_DESCRIPTIONS,
  ROLE_LABELS,
} from "@/lib/roles";
import { roleRequiresBranch, roleRequiresDistributorId } from "@/lib/user-form";
import type { DistributorResponse } from "@/types/branch-role";
import type { BranchResponse } from "@/types/branch";
import type { CompanyResponse } from "@/types/company";
import { ROLES, type Role, type UserResponse } from "@/types/user";
export type UserFormValues = {
  username: string;
  password: string;
  role: Role;
  branchId: string;
  distributorId: string;
  enabled: boolean;
};

type UserFormDialogProps = {
  mode: "create" | "edit";
  user?: UserResponse;
  branches: BranchResponse[];
  companies: CompanyResponse[];
  distributors: DistributorResponse[];
  branchesLoading: boolean;
  open: boolean;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (values: UserFormValues) => void;
  onDelete?: () => void;
  deleting?: boolean;
};

const emptyForm: UserFormValues = {
  username: "",
  password: "",
  role: "DISTRIBUTOR",
  branchId: "",
  distributorId: "",
  enabled: true,
};

export function UserFormDialog({
  mode,
  user,
  branches,
  companies,
  distributors,
  branchesLoading,
  open,
  saving,
  error,
  onClose,
  onSubmit,
  onDelete,
  deleting = false,
}: UserFormDialogProps) {
  const [form, setForm] = useState<UserFormValues>(emptyForm);

  const selectedBranchDetail = useMemo(() => {
    if (!form.branchId) return null;
    const branch = branches.find((b) => String(b.id) === form.branchId);
    return branch ? formatBranchLabel(branch, companies) : null;
  }, [form.branchId, branches, companies]);

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && user) {
      setForm({
        username: user.username,
        password: "",
        role: user.role,
        branchId: user.branchId != null ? String(user.branchId) : "",
        distributorId:
          user.distributorId != null ? String(user.distributorId) : "",
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
      <div className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-xl">
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
                ? "Define las credenciales de acceso al panel (login con usuario y contraseña)."
                : "Actualiza datos, rol o sucursal del usuario."}
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
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Usuario</span>
            <input
              type="text"
              required
              autoComplete="username"
              value={form.username}
              onChange={(e) =>
                setForm((f) => ({ ...f, username: e.target.value }))
              }
              placeholder="correo o identificador único"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-ring/20"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">
              Contraseña
              {mode === "edit" && (
                <span className="font-normal text-muted"> (opcional)</span>
              )}
            </span>
            <PasswordInput
              value={form.password}
              onChange={(password) => setForm((f) => ({ ...f, password }))}
              autoComplete={mode === "create" ? "new-password" : "off"}
              required={mode === "create"}
              placeholder={mode === "create" ? "Mínimo 6 caracteres" : ""}
            />
            {mode === "create" && (
              <p className="mt-1.5 text-xs text-muted">
                Será la clave que el usuario usará en la pantalla de inicio de
                sesión.
              </p>
            )}
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Rol</span>
            <select
              value={form.role}
              onChange={(e) => {
                const role = e.target.value as Role;
                setForm((f) => ({
                  ...f,
                  role,
                  ...(role !== "DISTRIBUTOR" ? { distributorId: "" } : {}),
                }));
              }}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-ring/20"
            >
              {ROLES.map((role) => {
                const assignable = isUserRoleAssignable(
                  role,
                  mode === "edit" ? user?.role : undefined,
                );
                return (
                  <option key={role} value={role} disabled={!assignable}>
                    {ROLE_LABELS[role]} ({role})
                    {!assignable ? " — no disponible" : ""}
                  </option>
                );
              })}
              <option disabled value="__CLIENT_PLACEHOLDER__">
                Cliente — no disponible temporalmente
              </option>
            </select>
            <p className="mt-1.5 text-xs text-muted">
              {ROLE_DESCRIPTIONS[form.role]}
            </p>
            <p className="mt-1 text-xs text-muted">
              Técnico, centro de servicio y cliente no se pueden asignar por ahora.
            </p>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">
              Sucursal
              {!roleRequiresBranch(form.role) && (
                <span className="font-normal text-muted"> (opcional)</span>
              )}
            </span>
            <BranchSelect
              value={form.branchId}
              onChange={(branchId) => setForm((f) => ({ ...f, branchId }))}
              branches={branches}
              companies={companies}
              loading={branchesLoading}
              disabled={branchesLoading}
            />
            {roleRequiresBranch(form.role) && !form.branchId && (
              <p className="mt-1.5 text-xs text-amber-700 dark:text-amber-300">
                Obligatoria para distribuidores, técnicos y centros de servicio.
              </p>
            )}
            {selectedBranchDetail && (
              <p
                className="mt-1.5 truncate text-xs text-muted"
                title={selectedBranchDetail}
              >
                {selectedBranchDetail}
              </p>
            )}
          </label>

          {roleRequiresDistributorId(form.role) && (
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">
                Registro distribuidor
              </span>
              <span className="mb-1.5 block text-xs text-muted">
                <code className="text-[11px]">distributorId</code> del catálogo.
                El API filtrará clientes, sucursales y empresas de este
                distribuidor al iniciar sesión.
              </span>
              <DistributorIdSelect
                value={form.distributorId}
                onChange={(distributorId) =>
                  setForm((f) => ({ ...f, distributorId }))
                }
                distributors={distributors}
                branches={branches}
                companies={companies}
                loading={branchesLoading}
                disabled={branchesLoading}
                required
              />
            </label>
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
            deleting={deleting}
            submitDisabled={branchesLoading}
            onClose={onClose}
            onDelete={onDelete}
            createLabel="Crear y dar acceso"
          />
        </form>
      </div>
    </div>
  );
}
