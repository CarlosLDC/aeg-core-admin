"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RoleBadge } from "@/components/users/role-badge";
import {
  UserFormDialog,
  type UserFormValues,
} from "@/components/users/user-form-dialog";
import { DetailCard, DetailField } from "@/components/resource-view/detail-fields";
import { ResourceViewActions } from "@/components/resource-view/resource-view-actions";
import { ResourceViewShell } from "@/components/resource-view/resource-view-shell";
import { useCompanyScope } from "@/context/company-scope-provider";
import { useToast } from "@/context/toast-provider";
import { useResourceId } from "@/hooks/use-resource-id";
import { branchLabelById } from "@/lib/branches";
import { fetchBranches } from "@/lib/branches-api";
import { fetchCompanies } from "@/lib/companies-api";
import { fetchDistributors } from "@/lib/distributors-api";
import {
  deleteUser,
  fetchUserById,
  getUsersErrorMessage,
  updateUser,
} from "@/lib/users-api";
import { validateUserEditForm } from "@/lib/user-form";
import { branchPath, userPath } from "@/lib/resource-routes";
import type { BranchResponse } from "@/types/branch";
import type { DistributorResponse } from "@/types/branch-role";
import type { CompanyResponse } from "@/types/company";
import type { UserResponse } from "@/types/user";

function parseOptionalId(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

export function UserView() {
  const id = useResourceId();
  const router = useRouter();
  const toast = useToast();
  const { scope } = useCompanyScope();

  const [user, setUser] = useState<UserResponse | null>(null);
  const [branches, setBranches] = useState<BranchResponse[]>([]);
  const [companies, setCompanies] = useState<CompanyResponse[]>([]);
  const [distributors, setDistributors] = useState<DistributorResponse[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const scopeBranches = scope?.branches ?? branches;
  const scopeCompanies = scope?.companies ?? companies;

  const load = useCallback(async () => {
    if (id == null) {
      setError("Identificador de usuario no válido.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await fetchUserById(id);
      setUser(data);
    } catch (err) {
      setError(getUsersErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    setCatalogLoading(true);
    Promise.all([
      scope ? Promise.resolve(scope.companies) : fetchCompanies(),
      scope ? Promise.resolve(scope.branches) : fetchBranches(),
      fetchDistributors(),
    ])
      .then(([companyRows, branchRows, distributorRows]) => {
        if (cancelled) return;
        setCompanies(companyRows);
        setBranches(branchRows);
        setDistributors(distributorRows);
      })
      .finally(() => {
        if (!cancelled) setCatalogLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [scope]);

  async function handleSubmit(values: UserFormValues) {
    if (!user) return;

    const validationError = validateUserEditForm(values, user.role);
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setSaving(true);
    setFormError(null);
    const branchId = parseOptionalId(values.branchId);
    const distributorId = parseOptionalId(values.distributorId);
    const username = values.username.trim();

    try {
      const body: Parameters<typeof updateUser>[1] = {
        username,
        role: values.role,
        enabled: values.enabled,
      };
      if (values.password.trim()) {
        body.password = values.password;
      }
      if (branchId !== undefined) {
        body.branchId = branchId;
      }
      if (distributorId !== undefined) {
        body.distributorId = distributorId;
      }
      const updated = await updateUser(user.id, body);
      setUser(updated);
      toast.success(`Usuario "${username}" actualizado.`, {
        href: userPath(updated.id),
      });
      setEditOpen(false);
    } catch (err) {
      const message = getUsersErrorMessage(err);
      setFormError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!user) return;
    if (
      !window.confirm(
        `¿Eliminar al usuario "${user.username}"? Esta acción no se puede deshacer.`,
      )
    ) {
      return;
    }

    setDeleting(true);
    try {
      await deleteUser(user.id);
      toast.success(`Usuario "${user.username}" eliminado.`);
      router.push("/users");
    } catch (err) {
      toast.error(getUsersErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  }

  const branchLabel =
    user?.branchId != null
      ? branchLabelById(scopeBranches, scopeCompanies, user.branchId)
      : "—";

  return (
    <>
      <ResourceViewShell
        backHref="/users"
        backLabel="Volver a usuarios"
        title={user?.username ?? "Usuario"}
        loading={loading}
        error={error}
        actions={
          user ? (
            <ResourceViewActions
              onEdit={() => {
                setFormError(null);
                setEditOpen(true);
              }}
              onDelete={() => void handleDelete()}
              deleting={deleting}
            />
          ) : undefined
        }
      >
        {user && (
          <DetailCard>
            <DetailField label="ID" value={String(user.id)} mono />
            <DetailField label="Usuario" value={user.username} mono />
            <DetailField label="Rol" value={<RoleBadge role={user.role} />} />
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

      {user && editOpen && (
        <UserFormDialog
          mode="edit"
          user={user}
          branches={scopeBranches}
          companies={scopeCompanies}
          distributors={distributors}
          branchesLoading={catalogLoading}
          open={editOpen}
          saving={saving}
          deleting={deleting}
          error={formError}
          onClose={() => {
            if (!saving && !deleting) setEditOpen(false);
          }}
          onSubmit={handleSubmit}
          onDelete={() => void handleDelete()}
        />
      )}
    </>
  );
}
