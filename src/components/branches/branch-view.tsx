"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BranchMissingContractNotice } from "@/components/branches/branch-missing-contract-notice";
import { BranchCurrentContractCard } from "@/components/branches/branch-current-contract-card";
import { BranchTypeBadges } from "@/components/branches/branch-type-badges";
import {
  BranchCreateWizardDialog,
  type BranchWizardValues,
} from "@/components/branches/branch-create-wizard-dialog";
import { emptyBranchWizardContractDraft } from "@/components/branches/branch-wizard-types";
import {
  ClientEditDialog,
  type ClientEditValues,
} from "@/components/clients/client-edit-dialog";
import { ContributorBadge } from "@/components/companies/contributor-badge";
import {
  DetailCard,
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
import { useDistributorStaffBranchId } from "@/hooks/use-distributor-staff-branch-id";
import { useResourceId } from "@/hooks/use-resource-id";
import {
  canCancelModificationReview,
  canCreateContractRecord,
  canDeleteBranchRecord,
  canDeleteContractRecord,
  canManageContracts,
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
import { toClientModificationProposedData } from "@/lib/client-form";
import {
  fetchClientByBranchId,
  getClientsErrorMessage,
  requestClientDelete,
  requestClientUpdate,
} from "@/lib/clients-api";
import {
  cancelClientModificationRequest,
  fetchClientModificationRequestById,
  getClientModificationRequestsErrorMessage,
} from "@/lib/client-modification-requests-api";
import {
  fetchCompanyById,
  getCompaniesErrorMessage,
  updateCompany,
} from "@/lib/companies-api";
import { fetchDistributors } from "@/lib/distributors-api";
import { formatDate } from "@/lib/datetime-form";
import {
  getBranchMissingContractKinds,
  missingContractLabels,
} from "@/lib/branch-contract-coverage";
import { can } from "@/lib/permissions/can";
import { isDistributorStaffBranch } from "@/lib/distributor-scope";
import { branchPath } from "@/lib/resource-routes";
import { hrefForBranchClientDistributor } from "@/lib/table-foreign-hrefs";
import { toBranchRequest } from "@/lib/branch-request";
import { invalidateCatalogRoles } from "@/lib/catalog-roles-cache";
import type { BranchWithRoles } from "@/types/branch";
import type { ClientResponse, DistributorResponse } from "@/types/branch-role";
import type { ClientModificationProposedData } from "@/types/client-modification-request";
import type { CompanyResponse } from "@/types/company";
import { isDistributorPanelRole } from "@/types/user";

import {
  branchToWizardValues,
  toBranchFormValues,
  toBranchRoleFormState,
} from "@/lib/branch-form-mappers";
import type { BranchFormValues } from "@/components/branches/branch-form-dialog";
import type { BranchRoleFormState } from "@/lib/branch-roles";
export function BranchView() {
  const id = useResourceId();
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const { user } = useAuth();
  const { scope, refresh } = useCompanyScope();
  const isTechnician = isDistributorPanelRole(user?.role);
  const staffBranchId = useDistributorStaffBranchId(user?.distributorId ?? null);
  const canModify = user ? canUpdateBranchRecord(user.role) : false;
  const canDelete = user ? canDeleteBranchRecord(user.role) : false;
  const canRequestReview = isTechnician;
  const canCancelReview = user ? canCancelModificationReview(user.role) : false;
  const canReadContracts = user ? can(user.role, "contracts", "read") : false;
  const canCreateContract = user ? canCreateContractRecord(user.role) : false;
  const canModifyContract = user ? canManageContracts(user.role) : false;
  const canDeleteContract = user ? canDeleteContractRecord(user.role) : false;
  const { coverage: contractCoverage, refresh: refreshContractCoverage } =
    useContractPartyCoverage(canReadContracts);

  const [branch, setBranch] = useState<BranchWithRoles | null>(null);
  const [client, setClient] = useState<ClientResponse | null>(null);
  const [company, setCompany] = useState<CompanyResponse | null>(null);
  const [distributors, setDistributors] = useState<DistributorResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [cancellingReview, setCancellingReview] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [pendingProposed, setPendingProposed] =
    useState<Partial<ClientModificationProposedData> | null>(null);

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

      if (isTechnician) {
        setClient(null);
        setPendingProposed(null);
        const isStaffBranch = isDistributorStaffBranch(branchData.id, staffBranchId);
        try {
          const companyRow = await fetchCompanyById(branchData.companyId);
          setCompany(companyRow);
        } catch {
          setCompany(null);
        }
        if (isStaffBranch || !branchData.client) {
          return;
        }
        try {
          const clientRow = await fetchClientByBranchId(branchData.id);
          if (!clientRow) {
            return;
          }
          if (
            user?.distributorId != null &&
            clientRow.distributorId !== user.distributorId
          ) {
            setError("No tienes acceso a esta empresa.");
            setClient(null);
            return;
          }
          setClient(clientRow);
          if (
            clientRow.reviewStatus === "PENDING_REVIEW" &&
            clientRow.activeModificationRequestId != null
          ) {
            try {
              const detail = await fetchClientModificationRequestById(
                clientRow.activeModificationRequestId,
              );
              setPendingProposed(
                detail.actionType === "UPDATE" ? detail.proposedData : null,
              );
            } catch {
              setPendingProposed(null);
            }
          }
        } catch {
          setClient(null);
          setPendingProposed(null);
        }
      } else {
        setClient(null);
        setCompany(null);
        setPendingProposed(null);
      }
    } catch (err) {
      setError(
        getBranchesErrorMessage(err) || getBranchRolesErrorMessage(err),
      );
    } finally {
      setLoading(false);
    }
  }, [id, scope, user, isTechnician, staffBranchId]);

  useEffect(() => {
    void load();
  }, [load]);

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

  async function handleSubmit(values: BranchWizardValues) {
    if (!branch || !canModify) {
      setFormError(CATALOG_MODIFY_FORBIDDEN_MESSAGE);
      return;
    }

    setSaving(true);
    setFormError(null);
    const formValues = toBranchFormValues(values);
    const body = toBranchRequest(formValues);
    const roles = toBranchRoleFormState(formValues);
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

  async function handleClientEdit(values: ClientEditValues) {
    if (!client || !branch || !company) {
      setFormError(CATALOG_MODIFY_FORBIDDEN_MESSAGE);
      return;
    }
    if (client.reviewStatus === "PENDING_REVIEW") {
      setFormError("Esta empresa tiene una solicitud pendiente de aprobación.");
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      await requestClientUpdate(
        client.id,
        toClientModificationProposedData(values, client.distributorId),
      );
      setEditOpen(false);
      await load();
      toast.success("Solicitud de actualización enviada a revisión.", {
        href: branchPath(branch.id),
      });
    } catch (err) {
      const message =
        getCompaniesErrorMessage(err) || getClientsErrorMessage(err);
      setFormError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  async function handleClientDelete() {
    if (!client || !canRequestReview) return;
    if (client.reviewStatus === "PENDING_REVIEW") {
      toast.error("Esta empresa ya tiene una solicitud pendiente de aprobación.");
      return;
    }
    const accepted = await confirm({
      title: "Eliminar",
      message:
        "¿Eliminar esta empresa? Un administrador debe aprobar la solicitud.",
      destructive: true,
    });
    if (!accepted) return;
    setDeleting(true);
    try {
      await requestClientDelete(client.id);
      await load();
      toast.success("Solicitud de eliminación enviada a revisión.");
    } catch (err) {
      toast.error(getClientsErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  }

  async function handleCancelReview() {
    if (!client || !canCancelReview) return;
    const requestId = client.activeModificationRequestId;
    if (requestId == null) {
      toast.error("No hay una solicitud de revisión activa para cancelar.");
      return;
    }
    const accepted = await confirm({
      title: "Cancelar revisión",
      message:
        "¿Deseas retirar la solicitud pendiente? La empresa volverá a estar activa sin cambios.",
      destructive: true,
      confirmLabel: "Cancelar revisión",
    });
    if (!accepted) return;

    setCancellingReview(true);
    try {
      await cancelClientModificationRequest(requestId);
      await load();
      toast.success("Solicitud de revisión cancelada.");
    } catch (err) {
      toast.error(getClientModificationRequestsErrorMessage(err));
    } finally {
      setCancellingReview(false);
    }
  }

  const companyLabel = branch
    ? companyNameById(companies, branch.companyId)
    : "";
  const companyRecord =
    company ?? companies.find((row) => row.id === branch?.companyId);
  const businessName =
    pendingProposed?.businessName?.trim() ||
    companyRecord?.businessName?.trim() ||
    client?.companyBusinessName?.trim() ||
    companyLabel;
  const rif =
    pendingProposed?.rif?.trim() ||
    companyRecord?.rif?.trim() ||
    client?.companyRif?.trim() ||
    "—";
  const contributorType =
    pendingProposed?.contributorType ?? companyRecord?.contributorType;
  const pendingReview = client?.reviewStatus === "PENDING_REVIEW";
  const isStaffBranch = isDistributorStaffBranch(branch?.id, staffBranchId);
  const technicianEmpresaView = isTechnician && branch != null && !isStaffBranch;

  const technicianDetailContent = useMemo(() => {
    if (!branch) return null;
    if (!client && !isStaffBranch) return null;

    return (
      <DetailCard>
        <DetailField
          label="Tipo de contribuyente"
          value={
            contributorType ? (
              <ContributorBadge type={contributorType} />
            ) : (
              "—"
            )
          }
        />
        <DetailField label="RIF" value={rif} mono />
        <DetailField label="Razón social" value={businessName} />
        <DetailField label="Estado" value={branch.state} />
        <DetailField label="Ciudad" value={branch.city} />
        <DetailField
          label="Dirección"
          value={
            pendingProposed?.address?.trim() || branch.address?.trim() || "—"
          }
        />
        <DetailField
          label="Persona de contacto"
          value={
            pendingProposed?.contactPersonName?.trim() ||
            branch.contactPersonName?.trim() ||
            "—"
          }
        />
        <DetailField
          label="Teléfono"
          value={
            pendingProposed?.phone?.trim() || branch.phone?.trim() || "—"
          }
        />
        <DetailField
          label="Correo"
          value={
            pendingProposed?.email?.trim() || branch.email?.trim() || "—"
          }
        />
      </DetailCard>
    );
  }, [branch, businessName, client, contributorType, isStaffBranch, pendingProposed, rif]);

  const title = branch
    ? technicianEmpresaView
      ? businessName || `${branch.city}, ${branch.state}`
      : companyLabel || `${branch.city}, ${branch.state}`
    : "Empresa";
  const detailSteps = useMemo(() => {
    if (!branch || isTechnician) return [];

    const steps = [
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

    if (canReadContracts && (branch.distributor || branch.serviceCenter)) {
      steps.push({
        id: "contract",
        label: "Contrato",
        content: (
          <div className="space-y-6">
            {branch.distributor ? (
              <BranchCurrentContractCard
                kind="distributor"
                partyId={branch.distributor.id}
                partyLabel={companyLabel || `${branch.city}, ${branch.state}`}
                branchId={branch.id}
                canCreate={canCreateContract}
                canModify={canModifyContract}
                canDelete={canDeleteContract}
                onChanged={refreshContractCoverage}
              />
            ) : null}
            {branch.serviceCenter ? (
              <BranchCurrentContractCard
                kind="serviceCenter"
                partyId={branch.serviceCenter.id}
                partyLabel={companyLabel || `${branch.city}, ${branch.state}`}
                branchId={branch.id}
                canCreate={canCreateContract}
                canModify={canModifyContract}
                canDelete={canDeleteContract}
                onChanged={refreshContractCoverage}
              />
            ) : null}
          </div>
        ),
      });
    }

    return steps;
  }, [
    branch,
    branches,
    canCreateContract,
    canDeleteContract,
    canModifyContract,
    canReadContracts,
    companies,
    companyLabel,
    distributors,
    isTechnician,
    refreshContractCoverage,
    user,
  ]);

  const missingContractLabelsForBranch = useMemo(() => {
    if (!branch || !contractCoverage) return [];
    return missingContractLabels(
      getBranchMissingContractKinds(branch, contractCoverage),
    );
  }, [branch, contractCoverage]);

  return (
    <>
      <ResourceViewShell
        backHref="/branches"
        backLabel="Volver a empresas"
        title={title}
        subtitle={
          branch && technicianEmpresaView
            ? rif !== "—"
              ? rif
              : `${branch.city}, ${branch.state}`
            : branch && companyLabel
              ? `${branch.city}, ${branch.state}`
              : undefined
        }
        loading={loading}
        error={error}
        actions={
          branch ? (
            <ResourceViewActions
              onEdit={
                technicianEmpresaView
                  ? client != null && !pendingReview
                    ? () => {
                        setFormError(null);
                        setEditOpen(true);
                      }
                    : undefined
                  : canModify
                    ? () => {
                        setFormError(null);
                        setEditOpen(true);
                      }
                    : undefined
              }
              onDelete={
                technicianEmpresaView
                  ? client != null && canRequestReview && !pendingReview
                    ? () => void handleClientDelete()
                    : undefined
                  : canDelete
                    ? () => void handleDelete()
                    : undefined
              }
              onCancelReview={
                technicianEmpresaView &&
                client != null &&
                canCancelReview &&
                pendingReview
                  ? () => void handleCancelReview()
                  : undefined
              }
              deleting={saving || deleting || cancellingReview}
            />
          ) : undefined
        }
      >
        {branch ? (
          <div className="space-y-4">
            {pendingReview && technicianEmpresaView && (
              <p
                role="status"
                className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200"
              >
                En revisión: espera la decisión del administrador o cancela la
                solicitud.
              </p>
            )}
            {!isTechnician && missingContractLabelsForBranch.length > 0 ? (
              <BranchMissingContractNotice
                missingLabels={missingContractLabelsForBranch}
              />
            ) : null}
            {technicianEmpresaView ? (
              technicianDetailContent
            ) : isStaffBranch && branch ? (
              <p className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm text-muted">
                Esta es la sede de tu distribuidora. No aparece en el listado de
                clientes; gestiona usuarios y operación desde el panel principal.
              </p>
            ) : (
              <DetailSectionsPager key={branch.id} steps={detailSteps} />
            )}
          </div>
        ) : null}
      </ResourceViewShell>

      {branch && editOpen && technicianEmpresaView && client ? (() => {
        const editCompany =
          company ?? companies.find((row) => row.id === branch.companyId);
        if (!editCompany) return null;
        return (
        <ClientEditDialog
          open={editOpen}
          saving={saving}
          error={formError}
          company={editCompany}
          branch={branch}
          onClose={() => {
            if (!saving) setEditOpen(false);
          }}
          onSubmit={(values) => void handleClientEdit(values)}
        />
        );
      })() : null}

      {branch && editOpen && !technicianEmpresaView && (
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
