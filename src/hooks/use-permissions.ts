"use client";

import { useMemo } from "react";
import { useAuth } from "@/context/auth-provider";
import { can } from "@/lib/permissions/can";
import type { Action, Resource } from "@/lib/permissions/types";
import type { Role } from "@/types/user";

export function usePermissions() {
  const { user } = useAuth();
  const role = user?.role;

  return useMemo(() => {
    const check = (resource: Resource, action: Action): boolean => {
      if (!role) return false;
      return can(role, resource, action);
    };

    return {
      role: role ?? null,
      isAdmin: role === "ADMIN",
      can: check,
      canRead: (resource: Resource) => check(resource, "read"),
      canCreate: (resource: Resource) => check(resource, "create"),
      canUpdate: (resource: Resource) => check(resource, "update"),
      canDelete: (resource: Resource) => check(resource, "delete"),
    };
  }, [role]);
}

export function useRole(): Role | null {
  const { user } = useAuth();
  return user?.role ?? null;
}
