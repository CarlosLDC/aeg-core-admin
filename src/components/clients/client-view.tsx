"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
import { useConfirm } from "@/context/confirm-provider";
import { useAuth } from "@/context/auth-provider";
import { useToast } from "@/context/toast-provider";
import {
  canCancelModificationReview,
  canUpdateBranchRecord,
  canUpdateCompanyRecord,
  CATALOG_MODIFY_FORBIDDEN_MESSAGE,
} from "@/lib/api-permissions";
import { fetchBranchById, updateBranch } from "@/lib/branches-api";
import {
  fetchClientById,
  getClientsErrorMessage,
  requestClientDelete,
  requestClientUpdate,
} from "@/lib/clients-api";
import { toClientModificationProposedData } from "@/lib/client-form";
import {
  cancelClientModificationRequest,
  fetchClientModificationRequestById,
  getClientModificationRequestsErrorMessage,
} from "@/lib/client-modification-requests-api";
import type { ClientModificationProposedData } from "@/types/client-modification-request";
import {
  fetchCompanyById,
  getCompaniesErrorMessage,
  updateCompany,
} from "@/lib/companies-api";
import { useResourceId } from "@/hooks/use-resource-id";
import {
  clientModificationReviewPath,
  clientModificationReviewsListPath,
} from "@/lib/resource-routes";
import type { BranchResponse } from "@/types/branch";
import type { ClientResponse } from "@/types/branch-role";
import type { CompanyResponse } from "@/types/company";
import { isDistributorPanelRole } from "@/types/user";

export function ClientView() {
  const id = useResourceId();
  const { user } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const [client, setClient] = useState<ClientResponse | null>(null);
  const [branch, setBranch] = useState<BranchResponse | null>(null);
  const [company, setCompany] = useState<CompanyResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [cancellingReview, setCancellingReview] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [pendingProposed, setPendingProposed] =
    useState<Partial<ClientModificationProposedData> | null>(null);
  const canEditCompany = user ? canUpdateCompanyRecord(user.role) : false;
  const canEditBranch = user ? canUpdateBranchRecord(user.role) : false;
  const canRequestReview = isDistributorPanelRole(user?.role);
  const canCancelReview = user ? canCancelModificationReview(user.role) : false;

  const load = useCallback(async () => {
    if (id == null) {
      setError("Identificador de cliente no válido.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const clientRow = await fetchClientById(id);
      if (
        isDistributorPanelRole(user?.role) &&
        user.distributorId != null &&
        clientRow.distributorId !== user.distributorId
      ) {
        setError("No tienes acceso a este cliente.");
        setClient(null);
        setBranch(null);
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
      } else {
        setPendingProposed(null);
      }
      try {
        const branchRow = await fetchBranchById(clientRow.branchId);
        setBranch(branchRow);
        try {
          const companyRow = await fetchCompanyById(branchRow.companyId);
          setCompany(companyRow);
        } catch {
          setCompany(null);
        }
      } catch {
        setBranch(null);
        setCompany(null);
      }
    } catch (err) {
      setError(getClientsErrorMessage(err));
      setClient(null);
      setBranch(null);
      setCompany(null);
    } finally {
      setLoading(false);
    }
  }, [id, user?.role, user?.distributorId]);

  useEffect(() => {
    void load();
  }, [load]);

  const businessName =
    pendingProposed?.businessName?.trim() ||
    company?.businessName?.trim() ||
    client?.companyBusinessName?.trim() ||
    "Cliente";
  const rif =
    pendingProposed?.rif?.trim() ||
    company?.rif?.trim() ||
    client?.companyRif?.trim() ||
    "—";
  const city =
    pendingProposed?.city?.trim() ||
    branch?.city?.trim() ||
    client?.branchCity?.trim() ||
    "—";
  const state =
    pendingProposed?.state?.trim() ||
    branch?.state?.trim() ||
    client?.branchState?.trim() ||
    "—";
  const title = businessName !== "Cliente" ? businessName : `${city}, ${state}`;

  const contributorType =
    pendingProposed?.contributorType ?? company?.contributorType;

  const distributorDetailContent = useMemo(() => {
    if (!client) return null;

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
        <DetailField label="Estado" value={state} />
        <DetailField label="Ciudad" value={city} />
        <DetailField
          label="Dirección"
          value={
            pendingProposed?.address?.trim() ||
            branch?.address?.trim() ||
            "—"
          }
        />
        <DetailField
          label="Persona de contacto"
          value={
            pendingProposed?.contactPersonName?.trim() ||
            branch?.contactPersonName?.trim() ||
            "—"
          }
        />
        <DetailField
          label="Teléfono"
          value={
            pendingProposed?.phone?.trim() ||
            branch?.phone?.trim() ||
            client.branchPhone?.trim() ||
            "—"
          }
        />
        <DetailField
          label="Correo"
          value={
            pendingProposed?.email?.trim() ||
            branch?.email?.trim() ||
            client.branchEmail?.trim() ||
            "—"
          }
        />
      </DetailCard>
    );
  }, [client, branch, contributorType, city, state, pendingProposed]);

  const adminDetailSteps = useMemo(() => {
    if (!client) return [];

    return [
      {
        id: "client",
        label: "Cliente",
        content: (
          <DetailSection title="Cliente" layout="quad">
            <DetailField label="RIF" value={rif} mono />
          </DetailSection>
        ),
      },
      {
        id: "company",
        label: "Empresa",
        content: (
          <DetailSection title="Empresa" layout="quad">
            <DetailField label="Razón social" value={businessName} />
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
          </DetailSection>
        ),
      },
      {
        id: "location",
        label: "Ubicación",
        content: (
          <DetailSection title="Ubicación y contacto" layout="quad">
            <DetailField label="Estado" value={state} />
            <DetailField label="Ciudad" value={city} />
            <DetailField
              label="Dirección"
              value={
                pendingProposed?.address?.trim() ||
                branch?.address?.trim() ||
                "—"
              }
            />
            <DetailField
              label="Persona de contacto"
              value={
                pendingProposed?.contactPersonName?.trim() ||
                branch?.contactPersonName?.trim() ||
                "—"
              }
            />
            <DetailField
              label="Teléfono"
              value={
                pendingProposed?.phone?.trim() ||
                branch?.phone?.trim() ||
                client.branchPhone?.trim() ||
                "—"
              }
            />
            <DetailField
              label="Correo"
              value={
                pendingProposed?.email?.trim() ||
                branch?.email?.trim() ||
                client.branchEmail?.trim() ||
                "—"
              }
            />
          </DetailSection>
        ),
      },
    ];
  }, [
    client,
    branch,
    businessName,
    rif,
    city,
    state,
    contributorType,
    pendingProposed,
  ]);

  async function handleEdit(values: ClientEditValues) {
    if (!client || !branch || !company) {
      setFormError(CATALOG_MODIFY_FORBIDDEN_MESSAGE);
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      if (canRequestReview) {
        await requestClientUpdate(
          client.id,
          toClientModificationProposedData(values, client.distributorId),
        );
        setEditOpen(false);
        await load();
        toast.success("Solicitud de actualización enviada a revisión.");
        return;
      }
      if (!canEditCompany || !canEditBranch) {
        setFormError(CATALOG_MODIFY_FORBIDDEN_MESSAGE);
        return;
      }
      const [updatedCompany, updatedBranch] = await Promise.all([
        updateCompany(company.id, {
          businessName: values.businessName,
          rif: values.rif,
          contributorType: values.contributorType,
        }),
        updateBranch(branch.id, {
          companyId: company.id,
          city: values.city,
          state: values.state,
          address: values.address || undefined,
          contactPersonName: values.contactPersonName.trim() || undefined,
          phone: values.phone || undefined,
          email: values.email || undefined,
        }),
      ]);
      setCompany(updatedCompany);
      setBranch(updatedBranch);
      setEditOpen(false);
      toast.success("Cliente actualizado.");
    } catch (err) {
      const message =
        getCompaniesErrorMessage(err) || getClientsErrorMessage(err);
      setFormError(message);
      toast.error(message);
    } finally {
      setSaving(false);
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
        "¿Deseas retirar la solicitud pendiente? El cliente volverá a estar activo sin cambios.",
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

  async function handleDelete() {
    if (!client || !canRequestReview) return;
    const accepted = await confirm({
      title: "Eliminar",
      message:
        "¿Eliminar este cliente? Un administrador debe aprobar la solicitud.",
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

  const pendingReview = client?.reviewStatus === "PENDING_REVIEW";
  const isAdmin = user?.role === "ADMIN";
  const reviewHref =
    client?.activeModificationRequestId != null
      ? clientModificationReviewPath(client.activeModificationRequestId)
      : clientModificationReviewsListPath;

  return (
    <>
      <ResourceViewShell
        backHref="/branches"
        backLabel="Volver a empresas"
        title={title}
        subtitle={rif !== "—" ? rif : undefined}
        loading={loading}
        error={error}
        actions={
          client ? (
            <ResourceViewActions
              onEdit={
                (canRequestReview || (canEditCompany && canEditBranch)) &&
                !pendingReview
                  ? () => {
                      setFormError(null);
                      setEditOpen(true);
                    }
                  : undefined
              }
              onDelete={
                canRequestReview && !pendingReview
                  ? () => void handleDelete()
                  : undefined
              }
              onCancelReview={
                canCancelReview && pendingReview
                  ? () => void handleCancelReview()
                  : undefined
              }
              deleting={saving || deleting || cancellingReview}
            />
          ) : undefined
        }
      >
        {client ? (
          <div className="space-y-4">
            {pendingReview && (
              <p
                role="status"
                className="flex flex-wrap items-center gap-x-1.5 gap-y-1 rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200"
              >
                <span>
                  {isAdmin
                    ? "En revisión: ediciones bloqueadas."
                    : "En revisión: espera la decisión del administrador o cancela la solicitud."}
                </span>
                {isAdmin && (
                  <Link
                    href={reviewHref}
                    className="shrink-0 font-medium text-accent hover:underline"
                  >
                    Ver solicitud
                  </Link>
                )}
              </p>
            )}
            {canRequestReview ? (
              distributorDetailContent
            ) : (
              <DetailSectionsPager key={client.id} steps={adminDetailSteps} />
            )}
          </div>
        ) : null}
      </ResourceViewShell>
      {client && branch && company && editOpen ? (
        <ClientEditDialog
          open={editOpen}
          saving={saving}
          error={formError}
          company={company}
          branch={branch}
          onClose={() => {
            if (!saving) setEditOpen(false);
          }}
          onSubmit={handleEdit}
        />
      ) : null}
    </>
  );
}
