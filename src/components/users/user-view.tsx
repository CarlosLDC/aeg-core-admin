"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RoleBadge } from "@/components/users/role-badge";
import { UserAccessBadge } from "@/components/users/user-access-badge";
import {
  UserFormDialog,
  type UserFormValues,
} from "@/components/users/user-form-dialog";
import { DetailField, DetailSection } from "@/components/resource-view/detail-fields";
import { ResourceViewActions } from "@/components/resource-view/resource-view-actions";
import { ResourceViewShell } from "@/components/resource-view/resource-view-shell";
import { useToast } from "@/context/toast-provider";
import { useConfirm } from "@/context/confirm-provider";
import { useResourceId } from "@/hooks/use-resource-id";
import { distributorLabel } from "@/lib/branch-roles";
import { fetchBranches } from "@/lib/branches-api";
import { fetchCompanies } from "@/lib/companies-api";
import { fetchDistributors } from "@/lib/distributors-api";
import {
  deleteUser,
  fetchUserById,
  getUsersErrorMessage,
  updateUser,
} from "@/lib/users-api";
import {
  validateUserEditForm,
  resolveUserDistributorId,
  resolveUserBranchId,
  resolveUserNationalId,
} from "@/lib/user-form";
import { ROLE_DESCRIPTIONS } from "@/lib/roles";
import {
  FISCAL_BOOK_PORTAL_URL,
  userDistributorDisplayLabel,
  userFiscalBookWriteLabel,
  userNationalIdDisplayLabel,
} from "@/lib/user-access";
import type { BranchResponse } from "@/types/branch";
import type { DistributorResponse } from "@/types/branch-role";
import type { CompanyResponse } from "@/types/company";
import type { UserResponse } from "@/types/user";
import { userPath } from "@/lib/resource-routes";

function displayUserName(user: UserResponse): string {
  return user.name?.trim() || user.username?.trim() || user.email;
}

export function UserView() {
  const id = useResourceId();
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();

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
    Promise.all([fetchCompanies(), fetchBranches(), fetchDistributors()])
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
  }, []);

  async function handleSubmit(values: UserFormValues) {
    if (!user) return;

    const validationError = validateUserEditForm(values);
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setSaving(true);
    setFormError(null);
    const distributorId = resolveUserDistributorId(
      values.role,
      values.distributorId,
    );
    const branchId = resolveUserBranchId(values.role, values.branchId);
    const nationalId = resolveUserNationalId(values.role, values.nationalId);
    const name = values.name.trim();
    const email = values.email.trim().toLowerCase();

    try {
      const body: Parameters<typeof updateUser>[1] = {
        name,
        email,
        role: values.role,
        distributorId,
        branchId,
        nationalId,
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

  const distributorName = user
    ? userDistributorDisplayLabel(
        user.role,
        user.distributorId != null
          ? (() => {
              const distributor = distributors.find(
                (row) => row.id === user.distributorId,
              );
              return distributor
                ? distributorLabel(distributor, branches, companies)
                : `Distribuidora #${user.distributorId}`;
            })()
          : null,
      )
    : "—";

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
          <>
            <DetailSection title="Identidad" layout="quad">
              <DetailField label="Nombre" value={displayUserName(user)} />
              <DetailField label="Correo" value={user.email} mono />
              <DetailField label="Rol" value={<RoleBadge role={user.role} />} />
              <DetailField
                label="Estado"
                value={user.enabled ? "Activo" : "Deshabilitado"}
              />
            </DetailSection>

            <DetailSection title="Portales y permisos" layout="quad">
              <DetailField
                label="Acceso"
                value={<UserAccessBadge role={user.role} />}
              />
              <DetailField
                label="Libro fiscal"
                value={userFiscalBookWriteLabel(user.role)}
              />
              <DetailField label="Distribuidora" value={distributorName} />
              <DetailField
                label="Cédula"
                value={userNationalIdDisplayLabel(user.role, user.nationalId)}
                mono
              />
              {user.role === "SENIAT" && (
                <DetailField
                  label="URL de acceso"
                  value={
                    <a
                      href={FISCAL_BOOK_PORTAL_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-accent underline-offset-2 hover:underline"
                    >
                      {FISCAL_BOOK_PORTAL_URL}
                    </a>
                  }
                />
              )}
              {user.role !== "SENIAT" && (
                <DetailField
                  label="Descripción del rol"
                  value={ROLE_DESCRIPTIONS[user.role]}
                />
              )}
            </DetailSection>
          </>
        )}
      </ResourceViewShell>

      {user && editOpen && (
        <UserFormDialog
          mode="edit"
          user={user}
          branches={branches}
          companies={companies}
          distributors={distributors}
          catalogLoading={catalogLoading}
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
