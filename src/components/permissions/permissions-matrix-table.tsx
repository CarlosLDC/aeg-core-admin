"use client";

import { useMemo, useState } from "react";
import { can } from "@/lib/permissions/can";
import {
  allowedRolesFor,
  isPermissionDefined,
} from "@/lib/permissions/matrix";
import {
  ACTION_COLUMN_LABELS,
  RESOURCE_LABELS,
  ROLE_ABBREV,
  ROLE_LABELS,
} from "@/lib/permissions/messages";
import { ACTIONS, RESOURCES, type Action, type Resource } from "@/lib/permissions/types";
import { ROLES, type Role } from "@/types/user";
import { cn } from "@/lib/utils";

type PermissionsMatrixTableProps = {
  highlightRole?: Role | null;
};

function MatrixCell({
  resource,
  action,
  highlightRole,
}: {
  resource: Resource;
  action: Action;
  highlightRole?: Role | null;
}) {
  if (!isPermissionDefined(resource, action)) {
    return (
      <span className="text-muted/35" title="No aplica">
        ·
      </span>
    );
  }

  const roles = allowedRolesFor(resource, action);

  return (
    <div className="flex flex-wrap justify-center gap-1">
      {roles.map((role) => {
        const highlighted = highlightRole === role;
        return (
          <span
            key={role}
            title={ROLE_LABELS[role]}
            className={cn(
              "rounded-md px-1.5 py-0.5 font-mono text-[10px] font-semibold leading-none",
              highlighted
                ? "bg-accent/20 text-accent ring-1 ring-accent/50"
                : "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300",
            )}
          >
            {ROLE_ABBREV[role]}
          </span>
        );
      })}
    </div>
  );
}

export function PermissionsMatrixTable({
  highlightRole,
}: PermissionsMatrixTableProps) {
  const [roleFilter, setRoleFilter] = useState<Role | "all">("all");
  const activeRole = roleFilter === "all" ? highlightRole : roleFilter;

  const filteredResources = useMemo(() => {
    if (roleFilter === "all") return RESOURCES;
    return RESOURCES.filter((resource) =>
      ACTIONS.some((action) => can(roleFilter, resource, action)),
    );
  }, [roleFilter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted">
          Cada celda lista los roles con permiso. La fuente de verdad es{" "}
          <code className="rounded bg-foreground/5 px-1 py-0.5 text-xs">
            src/lib/permissions/matrix.ts
          </code>
          .
        </p>
        <label className="flex items-center gap-2 text-sm">
          <span className="shrink-0 text-muted">Filtrar por rol</span>
          <select
            value={roleFilter}
            onChange={(e) =>
              setRoleFilter(e.target.value as Role | "all")
            }
            className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-sm text-card-foreground"
          >
            <option value="all">Todos los recursos</option>
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {ROLE_LABELS[role]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full min-w-[880px] text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-foreground/[0.02] text-muted">
              <th className="sticky left-0 z-10 min-w-[11rem] bg-card px-4 py-3 font-medium">
                Recurso
              </th>
              {ACTIONS.map((action) => (
                <th
                  key={action}
                  className="min-w-[7.5rem] px-2 py-3 text-center font-medium"
                >
                  {ACTION_COLUMN_LABELS[action]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredResources.map((resource) => (
              <tr
                key={resource}
                className="border-b border-border/60 last:border-0"
              >
                <th
                  scope="row"
                  className="sticky left-0 z-10 bg-card px-4 py-2.5 text-left font-normal"
                >
                  <span className="block text-sm font-medium text-card-foreground">
                    {RESOURCE_LABELS[resource]}
                  </span>
                  <span className="mt-0.5 block font-mono text-[10px] text-muted">
                    {resource}
                  </span>
                </th>
                {ACTIONS.map((action) => (
                  <td key={action} className="px-2 py-2.5 text-center align-middle">
                    <MatrixCell
                      resource={resource}
                      action={action}
                      highlightRole={activeRole}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {roleFilter !== "all" && filteredResources.length === 0 ? (
        <p className="text-sm text-muted">
          Este rol no tiene permisos explícitos en la matriz (solo acceso denegado).
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3 text-xs text-muted">
        {ROLES.map((role) => (
          <span key={role} className="inline-flex items-center gap-1.5">
            <span className="rounded-md bg-emerald-500/10 px-1.5 py-0.5 font-mono font-semibold text-emerald-800 dark:text-emerald-300">
              {ROLE_ABBREV[role]}
            </span>
            {ROLE_LABELS[role]}
          </span>
        ))}
        <span className="text-muted/50">· = acción no definida para el recurso</span>
      </div>
    </div>
  );
}
