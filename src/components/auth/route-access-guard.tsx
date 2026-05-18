"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2, ShieldX } from "lucide-react";
import { useAuth } from "@/context/auth-provider";
import {
  canAccessRoute,
  defaultPathForRole,
} from "@/lib/permissions/routes";

type RouteAccessGuardProps = {
  children: React.ReactNode;
};

/**
 * Comprueba que el rol del usuario puede leer la ruta actual (matriz RBAC).
 */
export function RouteAccessGuard({ children }: RouteAccessGuardProps) {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const allowed =
    user != null && canAccessRoute(user.role, pathname);

  useEffect(() => {
    if (isLoading || !user || allowed) return;
    router.replace(defaultPathForRole(user.role));
  }, [isLoading, user, allowed, router]);

  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-6 animate-spin text-muted" />
      </div>
    );
  }

  if (!allowed) {
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
