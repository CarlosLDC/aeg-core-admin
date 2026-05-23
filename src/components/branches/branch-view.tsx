"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BranchTypeBadges } from "@/components/branches/branch-type-badges";
import {
  BranchCreateWizardDialog,
  type BranchWizardValues,
} from "@/components/branches/branch-create-wizard-dialog";
import {
  DetailField,
  DetailSection,
} from "@/components/resource-view/detail-fields";
import { DetailSectionsPager } from "@/components/resource-view/detail-sections-pager";
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
import { toBranchRequest } from "@/lib/branch-request";
import { invalidateCatalogRoles } from "@/lib/catalog-roles-cache";
import type { BranchWithRoles } from "@/types/branch";
import type { DistributorResponse } from "@/types/branch-role";
import type { CompanyResponse } from "@/types/company";

type BranchFormValues = {
  companyId: string;
  city: string;
  state: string;
  address: string;
  contactPersonName: string;
  phone: string;
  email: string;
  isClient: boolean;
  isDistributor: boolean;
  isServiceCenter: boolean;
  clientDistributorId: string;
  isHeadquarters: boolean;
};

function toRoleFormState(values: BranchFormValues) {
  return {
    isClient: values.isClient,
    isDistributor: values.isDistributor,
    isServiceCenter: values.isServiceCenter,
    clientDistributorId: values.clientDistributorId,
  };
}

function toBranchFormValues(values: BranchWizardValues): BranchFormValues {
  return {
    companyId: values.linkedCompanyId != null ? String(values.linkedCompanyId) : "",
    city: values.city,
    state: values.state,
    address: values.address,
    contactPersonName: values.contactPersonName,
    phone: values.phone,
    email: values.email,
    isClient: values.isClient,
    isDistributor: values.isDistributor,
    isServiceCenter: values.isServiceCenter,
    clientDistributorId: values.clientDistributorId,
    isHeadquarters: values.isHeadquarters,
  };
}

function branchToWizardValues(
  branch: BranchWithRoles,
  companies: CompanyResponse[],
): BranchWizardValues {
  const company = companies.find((row) => row.id === branch.companyId);
  return {
    rif: company?.rif ?? "",
    businessName: company?.businessName ?? "",
    contributorType: company?.contributorType ?? "ordinario",
    linkedCompanyId: branch.companyId,
    city: branch.city,
    state: branch.state,
    address: branch.address ?? "",
    contactPersonName: branch.contactPersonName ?? "",
    phone: branch.phone ?? "",
    email: branch.email ?? "",
    isClient: Boolean(branch.client),
    isDistributor: Boolean(branch.distributor),
    isServiceCenter: Boolean(branch.serviceCenter),
    clientDistributorId: branch.client?.distributorId
      ? String(branch.client.distributorId)
      : "",
    isHeadquarters: Boolean(branch.isHeadquarters),
  };
}

export function BranchView() {
  const id = useResourceId();
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const { user } = useAuth();
  const { scope, refresh } = useCompanyScope();
  const isDistributor = user?.role === "DISTRIBUTOR";
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

  async function handleSubmit(values: BranchWizardValues) {
    if (!branch || !canModify) {
      setFormError(CATALOG_MODIFY_FORBIDDEN_MESSAGE);
      return;
    }

    setSaving(true);
    setFormError(null);
    const formValues = toBranchFormValues(values);
    const body = toBranchRequest(formValues);
    const roles = toRoleFormState(formValues);
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
      invalidateCatalogRoles();
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
      invalidateCatalogRoles();
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
  const detailSteps = useMemo(() => {
    if (!branch) return [];

    return [
      {
        id: "branch",
        label: "Sucursal",
        content: (
          <DetailSection title="Sucursal" layout="quad">
            <DetailField label="ID" value={String(branch.id)} mono />
            <DetailField
              label="Empresa"
              value={companyLabel}
              href={companyPath(branch.companyId)}
            />
            <DetailField label="ID empresa" value={String(branch.companyId)} mono />
            <DetailField
              label="Registrada"
              value={formatDate(branch.createdAt)}
            />
          </DetailSection>
        ),
      },
      {
        id: "location",
        label: "Ubicación",
        content: (
          <DetailSection title="Ubicación de la sucursal" layout="quad">
            <DetailField label="Ciudad" value={branch.city} />
            <DetailField label="Estado" value={branch.state} />
            <DetailField label="Dirección" value={branch.address || "—"} />
            <DetailField
              label="Casa matriz"
              value={branch.isHeadquarters ? "Sí" : "No"}
            />
          </DetailSection>
        ),
      },
      {
        id: "contact",
        label: "Contacto",
        content: (
          <DetailSection title="Contacto de la sucursal" layout="quad">
            <DetailField
              label="Persona de contacto"
              value={branch.contactPersonName?.trim() || "—"}
            />
            <DetailField label="Teléfono" value={branch.phone || "—"} />
            <DetailField label="Correo" value={branch.email || "—"} />
          </DetailSection>
        ),
      },
      {
        id: "operations",
        label: "Operación",
        content: (
          <DetailSection title="Datos operativos" layout="quad">
            <DetailField
              label="Roles"
              value={<BranchTypeBadges branch={branch} />}
            />
          </DetailSection>
        ),
      },
    ];
  }, [branch, companyLabel]);

  return (
    <>
      <ResourceViewShell
        backHref={isDistributor ? "/clients" : "/branches"}
        backLabel={isDistributor ? "Volver a clientes" : "Volver a sucursales"}
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
        {branch && <DetailSectionsPager key={branch.id} steps={detailSteps} />}
      </ResourceViewShell>

      {branch && editOpen && (
        <BranchCreateWizardDialog
          mode="edit"
          initialValues={branchToWizardValues(branch, companies)}
          companies={companies}
          branches={branches}
          distributors={distributors}
          companiesLoading={false}
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
