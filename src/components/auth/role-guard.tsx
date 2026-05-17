"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldX } from "lucide-react";
import { useAuth } from "@/context/auth-provider";
import {
  allowedRolesForPath,
  defaultPathForRole,
} from "@/lib/route-permissions";
import { ROLES, type Role } from "@/types/user";

type RoleGuardProps = {
  children: React.ReactNode;
  /** Lista explícita de roles (tiene prioridad sobre `path`). */
  allow?: Role[];
  /** Ruta del panel; usa los roles definidos en `navigation.ts`. */
  path?: string;
  redirectTo?: string;
};

function resolveAllowedRoles(allow: Role[] | undefined, path?: string): Role[] {
  if (allow) return allow;
  if (path) {
    const fromNav = allowedRolesForPath(path);
    if (fromNav) return fromNav;
  }
  return [...ROLES];
}

export function RoleGuard({
  allow,
  path,
  children,
  redirectTo,
}: RoleGuardProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const effectiveAllow = resolveAllowedRoles(allow, path);
  const fallback =
    redirectTo ?? (user ? defaultPathForRole(user.role) : "/");

  useEffect(() => {
    if (!isLoading && user && !effectiveAllow.includes(user.role)) {
      router.replace(fallback);
    }
  }, [isLoading, user, effectiveAllow, router, fallback]);

  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-6 animate-spin text-muted" />
      </div>
    );
  }

  if (!effectiveAllow.includes(user.role)) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <ShieldX className="size-10 text-muted" aria-hidden />
        <p className="text-sm text-muted">
          No tienes permiso para ver esta sección.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
