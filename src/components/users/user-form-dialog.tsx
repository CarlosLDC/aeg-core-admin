"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { formatBranchLabel } from "@/lib/branches";
import { X } from "lucide-react";
import { FieldLabel } from "@/components/ui/field-label";
import { FormDialogFooter } from "@/components/ui/form-dialog-footer";
import { BranchSelect } from "@/components/users/branch-select";
import { PasswordInput } from "@/components/ui/password-input";
import { ROLE_DESCRIPTIONS, ROLE_LABELS } from "@/lib/roles";
import {
  toggleButtonClass,
  USER_ROLE_TOGGLE_TONE,
} from "@/lib/toggle-button-styles";
import {
  eligibleRolesForBranch,
} from "@/lib/user-form";
import type { DistributorResponse } from "@/types/branch-role";
import type { ServiceCenterResponse } from "@/types/branch-role";
import type { BranchResponse } from "@/types/branch";
import type { CompanyResponse } from "@/types/company";
import type { Role, UserResponse } from "@/types/user";
import { cn } from "@/lib/utils";
export type UserFormValues = {
  name: string;
  email: string;
  password: string;
  role: Role;
  branchId: string;
  enabled: boolean;
};

type UserFormDialogProps = {
  mode: "create" | "edit";
  user?: UserResponse;
  branches: BranchResponse[];
  companies: CompanyResponse[];
  distributors: DistributorResponse[];
  serviceCenters: ServiceCenterResponse[];
  branchesLoading: boolean;
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
  branchId: "",
  enabled: true,
};

export function UserFormDialog({
  mode,
  user,
  branches,
  companies,
  distributors,
  serviceCenters,
  branchesLoading,
  open,
  saving,
  error,
  onClose,
  onSubmit,
}: UserFormDialogProps) {
  const [form, setForm] = useState<UserFormValues>(emptyForm);

  const selectedBranchDetail = useMemo(() => {
    if (!form.branchId) return null;
    const branch = branches.find((b) => String(b.id) === form.branchId);
    return branch ? formatBranchLabel(branch, companies) : null;
  }, [form.branchId, branches, companies]);

  const availableRoles = useMemo(
    () =>
      eligibleRolesForBranch(form.branchId, {
        distributors,
        serviceCenters,
      }),
    [form.branchId, distributors, serviceCenters],
  );

  const branchesForRole = useMemo(
    () =>
      branches.filter((branch) =>
        eligibleRolesForBranch(String(branch.id), {
          distributors,
          serviceCenters,
        }).length > 0,
      ),
    [branches, distributors, serviceCenters],
  );

  function handleBranchChange(branchId: string) {
    setForm((f) => {
      const eligible = eligibleRolesForBranch(branchId, {
        distributors,
        serviceCenters,
      });
      const next: UserFormValues = { ...f, branchId };
      if (!eligible.includes(f.role)) {
        next.role = eligible[0] ?? "DISTRIBUTOR";
      }
      return next;
    });
  }

  function handleRoleChange(role: Role) {
    setForm((f) => ({ ...f, role }));
  }

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && user) {
      setForm({
        name: user.name ?? "",
        email: user.email ?? user.username ?? "",
        password: "",
        role: user.role,
        branchId: user.branchId != null ? String(user.branchId) : "",
        enabled: user.enabled,
      });
    } else {
      setForm(emptyForm);
    }
  }, [open, mode, user]);

  useEffect(() => {
    if (!form.branchId || availableRoles.length === 0) return;
    if (availableRoles.includes(form.role)) return;
    setForm((prev) => ({ ...prev, role: availableRoles[0]! }));
  }, [availableRoles, form.branchId, form.role]);

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
                ? "Define rápidamente identidad, credenciales y asignación operativa."
                : "Actualiza identidad, credenciales y asignación operativa."}
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
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-ring/20"
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
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-ring/20"
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
            {mode === "create" && (
              <p className="text-xs text-muted">
                Esta será la clave para iniciar sesión.
              </p>
            )}
          </fieldset>

          <fieldset className="space-y-4 rounded-xl border border-border p-4">
            <legend className="px-1 text-sm font-semibold text-card-foreground">
              Asignación operativa
            </legend>
            <div className="grid gap-4 sm:grid-cols-2 sm:items-start">
              <div className="min-w-0">
                <FieldLabel required>Sucursal</FieldLabel>
                <BranchSelect
                  value={form.branchId}
                  onChange={handleBranchChange}
                  branches={branchesForRole}
                  companies={companies}
                  loading={branchesLoading}
                  disabled={branchesLoading}
                />
                <p
                  className="mt-1.5 line-clamp-2 min-h-[2.5rem] text-xs text-muted"
                  title={selectedBranchDetail ?? undefined}
                >
                  {selectedBranchDetail ?? "\u00a0"}
                </p>
              </div>

              <div className="min-w-0">
                <FieldLabel required>Rol</FieldLabel>
                <div
                  className={cn(
                    "grid gap-2",
                    availableRoles.length > 1 && "sm:grid-cols-2",
                    (!form.branchId || availableRoles.length === 0) &&
                      "opacity-70",
                  )}
                  role="group"
                  aria-label="Roles disponibles para la sucursal"
                >
                  {availableRoles.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted">
                      Selecciona una sucursal para ver roles disponibles.
                    </p>
                  ) : (
                    availableRoles.map((role) => {
                      const selected = form.role === role;
                      return (
                        <button
                          key={role}
                          type="button"
                          onClick={() => handleRoleChange(role)}
                          aria-pressed={selected}
                          className={cn(
                            "min-h-[2.75rem] rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30",
                            toggleButtonClass(selected, USER_ROLE_TOGGLE_TONE[role], {
                              className:
                                "inline-flex min-h-[2.75rem] flex-col items-start rounded-lg px-3 py-2 text-left",
                            }),
                          )}
                        >
                          <span className="block font-medium text-card-foreground">
                            {ROLE_LABELS[role]}
                          </span>
                          <span className="mt-0.5 block text-xs text-muted">
                            {ROLE_DESCRIPTIONS[role]}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {branchesForRole.length === 0 && (
              <p className="text-xs text-amber-700 dark:text-amber-300">
                No hay sucursales con roles operativos habilitados. Asigna rol de
                distribuidor o centro de servicio en Sucursales.
              </p>
            )}
            {!form.branchId && (
              <p className="text-xs text-amber-700 dark:text-amber-300">
                La sucursal es obligatoria.
              </p>
            )}
          </fieldset>

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
            submitDisabled={branchesLoading}
            onClose={onClose}
            createLabel="Crear usuario"
          />
        </form>
      </div>
    </div>
  );
}
