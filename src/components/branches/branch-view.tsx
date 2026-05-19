"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BranchTypeBadges } from "@/components/branches/branch-type-badges";
import {
  BranchFormDialog,
  type BranchFormValues,
} from "@/components/branches/branch-form-dialog";
import { DetailCard, DetailField } from "@/components/resource-view/detail-fields";
import { ResourceViewActions } from "@/components/resource-view/resource-view-actions";
import { ResourceViewShell } from "@/components/resource-view/resource-view-shell";
import { useAuth } from "@/context/auth-provider";
import { useCompanyScope } from "@/context/company-scope-provider";
import { useToast } from "@/context/toast-provider";
import { useConfirm } from "@/context/confirm-provider";
import { useResourceId } from "@/hooks/use-resource-id";
import {
  canDeleteBranchRecord,
  canUpdateBranchRecord,
  CATALOG_MODIFY_FORBIDDEN_MESSAGE,
} from "@/lib/api-permissions";
import { assertBranchInScope } from "@/lib/permissions/scope-access";
import {
  deleteBranchRoles,
  fetchBranchWithRolesById,
  getBranchRolesErrorMessage,
  syncBranchRoles,
} from "@/lib/branch-roles";
import { companyNameById } from "@/lib/branches";
import {
  deleteBranch,
  getBranchesErrorMessage,
  updateBranch,
} from "@/lib/branches-api";
import { fetchDistributors } from "@/lib/distributors-api";
import { formatDate } from "@/lib/datetime-form";
import { branchPath, companyPath } from "@/lib/resource-routes";
import type { BranchRequest, BranchWithRoles } from "@/types/branch";
import type { DistributorResponse } from "@/types/branch-role";
import type { CompanyResponse } from "@/types/company";

function toBranchRequest(values: BranchFormValues): BranchRequest {
  return {
    companyId: Number(values.companyId),
    city: values.city.trim(),
    state: values.state.trim(),
    address: values.address.trim() || undefined,
    phone: values.phone.trim() || undefined,
    email: values.email.trim() || undefined,
  };
}

function toRoleFormState(values: BranchFormValues) {
  return {
    isClient: values.isClient,
    isDistributor: values.isDistributor,
    isServiceCenter: values.isServiceCenter,
    clientDistributorId: values.clientDistributorId,
  };
}

export function BranchView() {
  const id = useResourceId();
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const { user } = useAuth();
  const { scope, refresh } = useCompanyScope();
  const canModify = user ? canUpdateBranchRecord(user.role) : false;
  const canDelete = user ? canDeleteBranchRecord(user.role) : false;

  const [branch, setBranch] = useState<BranchWithRoles | null>(null);
  const [distributors, setDistributors] = useState<DistributorResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const companies: CompanyResponse[] = scope?.companies ?? [];
  const branches = scope?.branches ?? [];

  const load = useCallback(async () => {
    if (id == null) {
      setError("Identificador de sucursal no válido.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [branchData, distributorRows] = await Promise.all([
        fetchBranchWithRolesById(id),
        fetchDistributors(),
      ]);
      if (user && !assertBranchInScope(scope, branchData, user.role)) {
        setError("No tienes acceso a este recurso.");
        setBranch(null);
        return;
      }
      setBranch(branchData);
      setDistributors(distributorRows);
    } catch (err) {
      setError(
        getBranchesErrorMessage(err) || getBranchRolesErrorMessage(err),
      );
    } finally {
      setLoading(false);
    }
  }, [id, scope, user]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSubmit(values: BranchFormValues) {
    if (!branch || !canModify) {
      setFormError(CATALOG_MODIFY_FORBIDDEN_MESSAGE);
      return;
    }

    setSaving(true);
    setFormError(null);
    const body = toBranchRequest(values);
    const roles = toRoleFormState(values);
    const label = `${values.city}, ${values.state}`;

    try {
      await updateBranch(branch.id, body);
      await syncBranchRoles(branch.id, branch, roles);
      const updated = await fetchBranchWithRolesById(branch.id);
      setBranch(updated);
      toast.success(`Sucursal "${label}" actualizada.`, {
        href: branchPath(updated.id),
      });
      setEditOpen(false);
      await refresh();
    } catch (err) {
      const message =
        getBranchesErrorMessage(err) || getBranchRolesErrorMessage(err);
      setFormError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!branch || !canDelete) {
      toast.error(CATALOG_MODIFY_FORBIDDEN_MESSAGE);
      return;
    }
    const label = `${branch.city}, ${branch.state}`;
    if (!(await confirm({ title: "Confirmar", message: `¿Eliminar la sucursal "${label}"? Se quitarán también sus roles (cliente, distribuidor, centro de servicio) si existen.`, destructive: true }))) {
      return;
    }

    setDeleting(true);
    try {
      await deleteBranchRoles(branch);
      await deleteBranch(branch.id);
      await refresh();
      toast.success(`Sucursal "${label}" eliminada.`);
      router.push("/branches");
    } catch (err) {
      const message =
        getBranchesErrorMessage(err) || getBranchRolesErrorMessage(err);
      toast.error(message);
    } finally {
      setDeleting(false);
    }
  }

  const companyLabel = branch
    ? companyNameById(companies, branch.companyId)
    : "";
  const title = branch ? `${branch.city}, ${branch.state}` : "Sucursal";

  return (
    <>
      <ResourceViewShell
        backHref="/branches"
        backLabel="Volver a sucursales"
        title={title}
        subtitle={companyLabel}
        loading={loading}
        error={error}
        actions={
          branch ? (
            <ResourceViewActions
              onEdit={
                canModify
                  ? () => {
                      setFormError(null);
                      setEditOpen(true);
                    }
                  : undefined
              }
              onDelete={canDelete ? () => void handleDelete() : undefined}
              deleting={deleting}
            />
          ) : undefined
        }
      >
        {branch && (
          <DetailCard>
            <DetailField label="ID" value={String(branch.id)} mono />
            <DetailField
              label="Empresa"
              value={companyLabel}
              href={companyPath(branch.companyId)}
              fullWidth
            />
            <DetailField label="Ciudad" value={branch.city} />
            <DetailField label="Estado" value={branch.state} />
            <DetailField
              label="Dirección"
              value={branch.address || "—"}
              fullWidth
            />
            <DetailField label="Teléfono" value={branch.phone || "—"} />
            <DetailField label="Correo" value={branch.email || "—"} />
            <DetailField
              label="Roles"
              value={<BranchTypeBadges branch={branch} />}
            />
            <DetailField
              label="Registrada"
              value={formatDate(branch.createdAt)}
            />
          </DetailCard>
        )}
      </ResourceViewShell>

      {branch && editOpen && (
        <BranchFormDialog
          mode="edit"
          branch={branch}
          companies={companies}
          branches={branches}
          distributors={distributors}
          companiesLoading={false}
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
