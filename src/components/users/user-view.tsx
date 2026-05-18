"use client";

import { useEffect, useState } from "react";
import { RoleBadge } from "@/components/users/role-badge";
import { DetailCard, DetailField } from "@/components/resource-view/detail-fields";
import { ResourceViewShell } from "@/components/resource-view/resource-view-shell";
import { useCompanyScope } from "@/context/company-scope-provider";
import { useResourceId } from "@/hooks/use-resource-id";
import { branchLabelById } from "@/lib/branches";
import { branchPath } from "@/lib/resource-routes";
import { fetchUserById, getUsersErrorMessage } from "@/lib/users-api";
import type { UserResponse } from "@/types/user";

export function UserView() {
  const id = useResourceId();
  const { scope } = useCompanyScope();
  const [user, setUser] = useState<UserResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id == null) {
      setError("Identificador de usuario no válido.");
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchUserById(id)
      .then((data) => {
        if (!cancelled) setUser(data);
      })
      .catch((err) => {
        if (!cancelled) setError(getUsersErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  const branches = scope?.branches ?? [];
  const companies = scope?.companies ?? [];
  const branchLabel =
    user?.branchId != null
      ? branchLabelById(branches, companies, user.branchId)
      : "—";

  return (
    <ResourceViewShell
      backHref="/users"
      backLabel="Volver a usuarios"
      title={user?.username ?? "Usuario"}
      loading={loading}
      error={error}
    >
      {user && (
        <DetailCard>
          <DetailField label="ID" value={String(user.id)} mono />
          <DetailField label="Usuario" value={user.username} mono />
          <DetailField
            label="Rol"
            value={<RoleBadge role={user.role} />}
          />
          <DetailField
            label="Estado"
            value={user.enabled ? "Activo" : "Deshabilitado"}
          />
          {user.branchId != null ? (
            <DetailField
              label="Sucursal"
              value={branchLabel}
              href={branchPath(user.branchId)}
              fullWidth
            />
          ) : null}
          {user.distributorId != null ? (
            <DetailField
              label="Distribuidor (ID)"
              value={String(user.distributorId)}
              mono
            />
          ) : null}
        </DetailCard>
      )}
    </ResourceViewShell>
  );
}
