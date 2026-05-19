"use client";

import { can } from "@/lib/permissions/can";
import {
  ACTION_COLUMN_LABELS,
  RESOURCE_LABELS,
  ROLE_LABELS,
} from "@/lib/permissions/messages";
import { ACTIONS, RESOURCES, type Action, type Resource } from "@/lib/permissions/types";
import { ROLES, type Role } from "@/types/user";
import { cn } from "@/lib/utils";

function permissionsForRole(role: Role): Array<{ resource: Resource; actions: Action[] }> {
  return RESOURCES.map((resource) => ({
    resource,
    actions: ACTIONS.filter((action) => can(role, resource, action)),
  })).filter((row) => row.actions.length > 0);
}

type PermissionsRoleCardsProps = {
  highlightRole?: Role | null;
};

export function PermissionsRoleCards({ highlightRole }: PermissionsRoleCardsProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {ROLES.map((role) => {
        const rows = permissionsForRole(role);
        const highlighted = highlightRole === role;
        return (
          <article
            key={role}
            className={cn(
              "rounded-xl border border-border bg-card p-4 shadow-sm",
              highlighted && "ring-2 ring-accent/40",
            )}
          >
            <h3 className="text-sm font-semibold text-card-foreground">
              {ROLE_LABELS[role]}
              {highlighted ? (
                <span className="ml-2 text-xs font-normal text-accent">
                  (tu rol)
                </span>
              ) : null}
            </h3>
            <ul className="mt-3 max-h-48 space-y-2 overflow-y-auto text-xs">
              {rows.map(({ resource, actions }) => (
                <li key={resource}>
                  <span className="font-medium text-card-foreground">
                    {RESOURCE_LABELS[resource]}
                  </span>
                  <span className="text-muted">
                    {": "}
                    {actions
                      .map((a) => ACTION_COLUMN_LABELS[a].toLowerCase())
                      .join(", ")}
                  </span>
                </li>
              ))}
            </ul>
          </article>
        );
      })}
    </div>
  );
}
