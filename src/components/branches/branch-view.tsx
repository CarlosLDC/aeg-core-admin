"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BranchMissingContractNotice } from "@/components/branches/branch-missing-contract-notice";
import { BranchTypeBadges } from "@/components/branches/branch-type-badges";
import {
  BranchCreateWizardDialog,
  type BranchWizardValues,
} from "@/components/branches/branch-create-wizard-dialog";
import { emptyBranchWizardContractDraft } from "@/components/branches/branch-wizard-types";
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
import { useContractPartyCoverage } from "@/hooks/use-contract-party-coverage";
import { useResourceId } from "@/hooks/use-resource-id";
import {
  canDeleteBranchRecord,
  canUpdateBranchRecord,
  CATALOG_MODIFY_FORBIDDEN_MESSAGE,
} from "@/lib/api-permissions";
import { assertBranchInScope } from "@/lib/permissions/scope-access";
import {
  clientDistributorSummary,
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
import {
  getBranchMissingContractKinds,
  missingContractLabels,
} from "@/lib/branch-contract-coverage";
import { can } from "@/lib/permissions/can";
import { branchPath } from "@/lib/resource-routes";
import { hrefForBranchClientDistributor } from "@/lib/table-foreign-hrefs";
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
    distributorContract: emptyBranchWizardContractDraft(),
    serviceCenterContract: emptyBranchWizardContractDraft(),
  };
}

export function BranchView() {
  const id = useResourceId();
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const { user } = useAuth();
  const { scope, refresh } = useCompanyScope();
  const isDistributor = user?.role === "TECHNICIAN";
  const canModify = user ? canUpdateBranchRecord(user.role) : false;
  const canDelete = user ? canDeleteBranchRecord(user.role) : false;
  const canReadContracts = user ? can(user.role, "contracts", "read") : false;
  const contractCoverage = useContractPartyCoverage(canReadContracts);

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
      setError("Identificador de empresa no válido.");
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
      toast.success(`Empresa "${label}" actualizada.`, {
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
    if (!(await confirm({ title: "Confirmar", message: `¿Eliminar la empresa "${label}"? Se quitarán también sus roles (cliente, distribuidor, centro de servicio) si existen.`, destructive: true }))) {
      return;
    }

    setDeleting(true);
    try {
      await deleteBranchRoles(branch);
      await deleteBranch(branch.id);
      invalidateCatalogRoles();
      await refresh();
      toast.success(`Empresa "${label}" eliminada.`);
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
  const title = branch
    ? companyLabel || `${branch.city}, ${branch.state}`
    : "Empresa";
  const detailSteps = useMemo(() => {
    if (!branch) return [];

    return [
      {
        id: "branch",
        label: "Empresa",
        content: (
          <DetailSection title="Empresa" layout="quad">
            <DetailField label="ID" value={String(branch.id)} mono />
            <DetailField label="Razón social" value={companyLabel} />
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
          <DetailSection title="Ubicación" layout="quad">
            <DetailField label="Ciudad" value={branch.city} />
            <DetailField label="Estado" value={branch.state} />
            <DetailField label="Dirección" value={branch.address || "—"} />
          </DetailSection>
        ),
      },
      {
        id: "contact",
        label: "Contacto",
        content: (
          <DetailSection title="Contacto" layout="quad">
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
            {branch.client ? (
              <DetailField
                label="Distribuidor del cliente"
                value={clientDistributorSummary(
                  branch,
                  distributors,
                  branches,
                  companies,
                )}
                href={
                  user
                    ? hrefForBranchClientDistributor(
                        branch,
                        distributors,
                        user.role,
                      )
                    : undefined
                }
              />
            ) : null}
          </DetailSection>
        ),
      },
    ];
  }, [branch, branches, companies, companyLabel, distributors, user]);

  const missingContractLabelsForBranch = useMemo(() => {
    if (!branch || !contractCoverage) return [];
    return missingContractLabels(
      getBranchMissingContractKinds(branch, contractCoverage),
    );
  }, [branch, contractCoverage]);

  return (
    <>
      <ResourceViewShell
        backHref={isDistributor ? "/clients" : "/branches"}
        backLabel={isDistributor ? "Volver a clientes" : "Volver a empresas"}
        title={title}
        subtitle={
          branch && companyLabel
            ? `${branch.city}, ${branch.state}`
            : undefined
        }
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
        {branch ? (
          <div className="space-y-4">
            {missingContractLabelsForBranch.length > 0 ? (
              <BranchMissingContractNotice
                missingLabels={missingContractLabelsForBranch}
                showContractsLink={canReadContracts}
              />
            ) : null}
            <DetailSectionsPager key={branch.id} steps={detailSteps} />
          </div>
        ) : null}
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
