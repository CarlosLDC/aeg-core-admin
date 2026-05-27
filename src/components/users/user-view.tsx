"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RoleBadge } from "@/components/users/role-badge";
import {
  UserFormDialog,
  type UserFormValues,
} from "@/components/users/user-form-dialog";
import { DetailField, DetailSection } from "@/components/resource-view/detail-fields";
import { ResourceViewActions } from "@/components/resource-view/resource-view-actions";
import { ResourceViewShell } from "@/components/resource-view/resource-view-shell";
import { useCompanyScope } from "@/context/company-scope-provider";
import { useToast } from "@/context/toast-provider";
import { useConfirm } from "@/context/confirm-provider";
import { useResourceId } from "@/hooks/use-resource-id";
import { branchLabelById } from "@/lib/branches";
import { fetchBranches } from "@/lib/branches-api";
import { fetchCompanies } from "@/lib/companies-api";
import { fetchDistributors } from "@/lib/distributors-api";
import { fetchServiceCenters } from "@/lib/service-centers-api";
import { formatDate } from "@/lib/datetime-form";
import {
  deleteUser,
  fetchUserById,
  getUsersErrorMessage,
  updateUser,
} from "@/lib/users-api";
import { validateUserEditForm, resolveUserBranchId } from "@/lib/user-form";
import { branchPath, userPath } from "@/lib/resource-routes";
import type { BranchResponse } from "@/types/branch";
import type { DistributorResponse } from "@/types/branch-role";
import type { ServiceCenterResponse } from "@/types/branch-role";
import type { CompanyResponse } from "@/types/company";
import type { UserResponse } from "@/types/user";

function displayUserName(user: UserResponse): string {
  return user.name?.trim() || user.username?.trim() || user.email;
}

export function UserView() {
  const id = useResourceId();
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const { scope } = useCompanyScope();

  const [user, setUser] = useState<UserResponse | null>(null);
  const [branches, setBranches] = useState<BranchResponse[]>([]);
  const [companies, setCompanies] = useState<CompanyResponse[]>([]);
  const [distributors, setDistributors] = useState<DistributorResponse[]>([]);
  const [serviceCenters, setServiceCenters] = useState<ServiceCenterResponse[]>(
    [],
  );
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
      fetchServiceCenters(),
    ])
      .then(([companyRows, branchRows, distributorRows, serviceCenterRows]) => {
        if (cancelled) return;
        setCompanies(companyRows);
        setBranches(branchRows);
        setDistributors(distributorRows);
        setServiceCenters(serviceCenterRows);
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

    const validationError = validateUserEditForm(
      values,
      { distributors, serviceCenters },
    );
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setSaving(true);
    setFormError(null);
    const branchId = resolveUserBranchId(values.role, values.branchId);
    const name = values.name.trim();
    const email = values.email.trim().toLowerCase();

    try {
      const body: Parameters<typeof updateUser>[1] = {
        name,
        email,
        role: values.role,
        branchId,
        enabled: values.enabled,
      };
      if (values.password.trim()) {
        body.password = values.password;
      }
      const updated = await updateUser(user.id, body);
      setUser(updated);
      toast.success(`Usuario "${name}" actualizado.`, {
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
    if (!(await confirm({ title: "Confirmar", message: `¿Eliminar al usuario "${displayUserName(user)}"? Esta acción no se puede deshacer.`, destructive: true }))) {
      return;
    }

    setDeleting(true);
    try {
      await deleteUser(user.id);
      toast.success(`Usuario "${displayUserName(user)}" eliminado.`);
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
  const userCreatedAt = (user as (UserResponse & { createdAt?: string }) | null)
    ?.createdAt;

  return (
    <>
      <ResourceViewShell
        backHref="/users"
        backLabel="Volver a usuarios"
        title={user ? displayUserName(user) : "Usuario"}
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
          <DetailSection title="Usuario" layout="quad">
            <DetailField label="ID" value={String(user.id)} mono />
            <DetailField label="Nombre" value={displayUserName(user)} />
            <DetailField label="Correo" value={user.email} mono />
            <DetailField label="Rol" value={<RoleBadge role={user.role} />} />
            <DetailField
              label="Estado"
              value={user.enabled ? "Activo" : "Deshabilitado"}
            />
            <DetailField label="Registrado" value={formatDate(userCreatedAt)} />
            <DetailField
              label="Sucursal"
              value={branchLabel}
              href={user.branchId != null ? branchPath(user.branchId) : undefined}
            />
          </DetailSection>
        )}
      </ResourceViewShell>

      {user && editOpen && (
        <UserFormDialog
          mode="edit"
          user={user}
          branches={scopeBranches}
          companies={scopeCompanies}
          distributors={distributors}
          serviceCenters={serviceCenters}
          branchesLoading={catalogLoading}
          open={editOpen}
          saving={saving}
          error={formError}
          onClose={() => {
            if (!saving) setEditOpen(false);
          }}
          onSubmit={handleSubmit}
        />
      )}
    </>
  );
}
