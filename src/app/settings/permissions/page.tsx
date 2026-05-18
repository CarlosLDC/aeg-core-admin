"use client";

import { AdminShell } from "@/components/admin/admin-shell";
import { usePermissions } from "@/hooks/use-permissions";
import { PERMISSION_MATRIX } from "@/lib/permissions/matrix";
import { ACTIONS, type Resource } from "@/lib/permissions/types";
import { RESOURCES } from "@/lib/permissions/types";

export default function PermissionsDebugPage() {
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

  return (
    <AdminShell
      title="Matriz de permisos"
      description="Vista de depuración del rol actual frente a la matriz efectiva del panel."
    >
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-foreground/[0.02] text-muted">
              <th className="px-4 py-3 font-medium">Recurso</th>
              {ACTIONS.map((action) => (
                <th key={action} className="px-3 py-3 font-medium capitalize">
                  {action}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {RESOURCES.map((resource) => (
              <tr key={resource} className="border-b border-border/60">
                <td className="px-4 py-2.5 font-mono text-xs">{resource}</td>
                {ACTIONS.map((action) => {
                  const defined = PERMISSION_MATRIX[resource]?.[action];
                  const allowed =
                    defined && perms.role
                      ? perms.can(resource as Resource, action)
                      : false;
                  return (
                    <td key={action} className="px-3 py-2.5 text-center">
                      {defined ? (
                        <span
                          className={
                            allowed
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-muted"
                          }
                        >
                          {allowed ? "✓" : "—"}
                        </span>
                      ) : (
                        <span className="text-muted/40">·</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
