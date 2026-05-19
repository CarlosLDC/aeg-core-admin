"use client";

import { AdminShell } from "@/components/admin/admin-shell";
import { PermissionsMatrixTable } from "@/components/permissions/permissions-matrix-table";
import { PermissionsRoleCards } from "@/components/permissions/permissions-role-cards";
import { useAuth } from "@/context/auth-provider";
import { usePermissions } from "@/hooks/use-permissions";
import { ROLE_LABELS } from "@/lib/permissions/messages";

export default function PermissionsPage() {
  const { user } = useAuth();
  const perms = usePermissions();

  if (!perms.isAdmin) {
    return (
      <AdminShell title="Permisos">
        <p className="text-sm text-muted">
          Solo administradores pueden ver la matriz de permisos.
        </p>
      </AdminShell>
    );
  }

  const currentRole = user?.role ?? null;

  return (
    <AdminShell
      title="Matriz de permisos"
      description="Reglas efectivas del panel por recurso, acción y rol."
    >
      <div className="space-y-8">
        {currentRole ? (
          <p className="rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted">
            Sesión actual:{" "}
            <span className="font-medium text-card-foreground">
              {ROLE_LABELS[currentRole]}
            </span>
            . Las etiquetas resaltadas en la tabla corresponden a este rol.
          </p>
        ) : null}

        <section aria-labelledby="permissions-matrix-heading">
          <h2
            id="permissions-matrix-heading"
            className="text-base font-semibold text-card-foreground"
          >
            Matriz recurso × acción
          </h2>
          <p className="mt-1 text-sm text-muted">
            Referencia alineada con{" "}
            <code className="rounded bg-foreground/5 px-1 text-xs">
              docs/permissions-matrix.md
            </code>{" "}
            y el backend RBAC.
          </p>
          <div className="mt-4">
            <PermissionsMatrixTable highlightRole={currentRole} />
          </div>
        </section>

        <section aria-labelledby="permissions-by-role-heading">
          <h2
            id="permissions-by-role-heading"
            className="text-base font-semibold text-card-foreground"
          >
            Resumen por rol
          </h2>
          <p className="mt-1 text-sm text-muted">
            Vista compacta de lo que cada rol puede hacer en el panel.
          </p>
          <div className="mt-4">
            <PermissionsRoleCards highlightRole={currentRole} />
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
