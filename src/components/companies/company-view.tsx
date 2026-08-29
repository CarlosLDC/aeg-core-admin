"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CompanyBranchesTable } from "@/components/companies/company-branches-table";
import { CompanyPrintersTable } from "@/components/companies/company-printers-table";
import { ContributorBadge } from "@/components/companies/contributor-badge";
import {
  CompanyFormDialog,
  type CompanyFormValues,
} from "@/components/companies/company-form-dialog";
import { DetailField, DetailSection } from "@/components/resource-view/detail-fields";
import { ResourceViewActions } from "@/components/resource-view/resource-view-actions";
import { ResourceViewShell } from "@/components/resource-view/resource-view-shell";
import { useAuth } from "@/context/auth-provider";
import { useCompanyScope } from "@/context/company-scope-provider";
import { useToast } from "@/context/toast-provider";
import { useConfirm } from "@/context/confirm-provider";
import { useResourceId } from "@/hooks/use-resource-id";
import {
  canDeleteCompanyRecord,
  canUpdateCompanyRecord,
  CATALOG_MODIFY_FORBIDDEN_MESSAGE,
} from "@/lib/api-permissions";
import { assertCompanyInScope } from "@/lib/permissions/scope-access";
import {
  deleteCompany,
  fetchCompanyById,
  getCompaniesErrorMessage,
  updateCompany,
} from "@/lib/companies-api";
import { companyPath } from "@/lib/resource-routes";
import { cn } from "@/lib/utils";
import type { CompanyResponse } from "@/types/company";
import { isFactoryCompany } from "@/lib/organization-roles";
import { isDistributorPanelRole } from "@/types/user";

type CompanyDetailPanel = "company" | "branches" | "printers";

export function CompanyView() {
  const id = useResourceId();
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const { user } = useAuth();
  const { scope, refresh } = useCompanyScope();
  const isDistributor = isDistributorPanelRole(user?.role);
  const canModify = user ? canUpdateCompanyRecord(user.role) : false;
  const canDelete = user ? canDeleteCompanyRecord(user.role) : false;

  const [company, setCompany] = useState<CompanyResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [detailPanel, setDetailPanel] = useState<CompanyDetailPanel>("company");
  const load = useCallback(async () => {
    if (id == null) {
      setError("Identificador de empresa no válido.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await fetchCompanyById(id);
      if (user && !assertCompanyInScope(scope, data, user.role)) {
        setError("No tienes acceso a este recurso.");
        setCompany(null);
        return;
      }
      setCompany(data);
    } catch (err) {
      setError(getCompaniesErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [id, scope, user]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSubmit(values: CompanyFormValues) {
    if (!company || !canModify) {
      setFormError(CATALOG_MODIFY_FORBIDDEN_MESSAGE);
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      const updated = await updateCompany(company.id, values);
      setCompany(updated);
      toast.success(
        `Empresa "${values.businessName || values.rif}" actualizada.`,
        { href: companyPath(updated.id) },
      );
      setEditOpen(false);
      await refresh();
    } catch (err) {
      const message = getCompaniesErrorMessage(err);
      setFormError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!company || !canDelete) {
      toast.error(CATALOG_MODIFY_FORBIDDEN_MESSAGE);
      return;
    }
    const label = company.businessName || company.rif;
    if (!(await confirm({ title: "Confirmar", message: `¿Eliminar "${label}"? Las sucursales vinculadas pueden verse afectadas.`, destructive: true }))) {
      return;
    }

    setDeleting(true);
    try {
      await deleteCompany(company.id);
      await refresh();
      toast.success(`Empresa "${label}" eliminada.`);
      router.push("/companies");
    } catch (err) {
      toast.error(getCompaniesErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  }

  const title = company?.rif || company?.businessName || "Empresa";

  return (
    <>
      <ResourceViewShell
        backHref={isDistributor ? "/branches" : "/companies"}
        backLabel="Volver a empresas"
        title={title}
        subtitle={company?.businessName || undefined}
        loading={loading}
        error={error}
        actions={
          company ? (
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
        {company && (
          <div className="space-y-4">
            <div
              className="inline-flex rounded-lg border border-border bg-card p-1"
              role="tablist"
              aria-label="Vista de empresa"
            >
              <button
                type="button"
                role="tab"
                aria-selected={detailPanel === "company"}
                onClick={() => setDetailPanel("company")}
                className={cn(
                  "rounded-md px-4 py-2 text-sm font-medium transition-colors",
                  detailPanel === "company"
                    ? "bg-accent text-accent-foreground shadow-sm"
                    : "text-muted hover:text-foreground",
                )}
              >
                Empresa
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={detailPanel === "branches"}
                onClick={() => setDetailPanel("branches")}
                className={cn(
                  "rounded-md px-4 py-2 text-sm font-medium transition-colors",
                  detailPanel === "branches"
                    ? "bg-accent text-accent-foreground shadow-sm"
                    : "text-muted hover:text-foreground",
                )}
              >
                Sucursales
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={detailPanel === "printers"}
                onClick={() => setDetailPanel("printers")}
                className={cn(
                  "rounded-md px-4 py-2 text-sm font-medium transition-colors",
                  detailPanel === "printers"
                    ? "bg-accent text-accent-foreground shadow-sm"
                    : "text-muted hover:text-foreground",
                )}
              >
                Impresoras
              </button>
            </div>

            {detailPanel === "company" ? (
              <DetailSection title="Empresa" layout="quad">
                <DetailField label="RIF" value={company.rif} mono />
                <DetailField
                  label="Razón social"
                  value={company.businessName || "—"}
                />
                <DetailField
                  label="Tipo de contribuyente"
                  value={<ContributorBadge type={company.contributorType} />}
                />
                <DetailField
                  label="Tipo de organización"
                  value={
                    isFactoryCompany(company.organizationType) ? (
                      <span className="inline-flex rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:text-emerald-200">
                        Fábrica (AEG)
                      </span>
                    ) : (
                      "Estándar"
                    )
                  }
                />
              </DetailSection>
            ) : detailPanel === "branches" ? (
              <CompanyBranchesTable
                companyId={company.id}
                companies={scope?.companies ?? [company]}
              />
            ) : (
              <CompanyPrintersTable
                companyId={company.id}
                companies={scope?.companies ?? [company]}
              />
            )}
          </div>
        )}
      </ResourceViewShell>

      {company && editOpen && (
        <CompanyFormDialog
          mode="edit"
          company={company}
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
