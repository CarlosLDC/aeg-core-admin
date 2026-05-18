"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { BranchTypeBadges } from "@/components/branches/branch-type-badges";
import {
  BranchCreateWizardDialog,
  type BranchWizardValues,
} from "@/components/branches/branch-create-wizard-dialog";
import {
  BranchFormDialog,
  type BranchFormValues,
} from "@/components/branches/branch-form-dialog";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { TablePagination } from "@/components/ui/table-pagination";
import { useAuth } from "@/context/auth-provider";
import {
  canCreateCatalogRecord,
  canModifyCatalogRecord,
  CATALOG_CREATE_FORBIDDEN_MESSAGE,
  CATALOG_MODIFY_FORBIDDEN_MESSAGE,
} from "@/lib/api-permissions";
import { useCompanyScope } from "@/context/company-scope-provider";
import { canBrowseOtherCompanies } from "@/lib/company-scope";
import { useToast } from "@/context/toast-provider";
import { usePagination } from "@/hooks/use-pagination";
import {
  deleteBranchRoles,
  distributorLabel,
  getBranchRolesErrorMessage,
  mergeBranchesWithRoles,
  syncBranchRoles,
} from "@/lib/branch-roles";
import {
  companyNameById,
  companySearchTextById,
  formatBranchShort,
} from "@/lib/branches";
import {
  createBranch,
  deleteBranch,
  fetchBranches,
  getBranchesErrorMessage,
  updateBranch,
} from "@/lib/branches-api";
import {
  createCompany,
  getCompaniesErrorMessage,
} from "@/lib/companies-api";
import { findCompanyByRif } from "@/lib/seniat-extract";
import { fetchClients } from "@/lib/clients-api";
import { fetchDistributors } from "@/lib/distributors-api";
import { fetchServiceCenters } from "@/lib/service-centers-api";
import type { BranchRequest, BranchWithRoles } from "@/types/branch";
import type { CompanyResponse } from "@/types/company";
import type { DistributorResponse } from "@/types/branch-role";
import { cn } from "@/lib/utils";
import { TableScroll } from "@/components/ui/table-scroll";
import { TruncatedText } from "@/components/ui/truncated-text";
import { branchPath, companyPath } from "@/lib/resource-routes";
import { ClickableTableRow } from "@/components/ui/clickable-table-row";
import { ViewResourceLink } from "@/components/ui/view-resource-link";

const TYPE_FILTER_OPTIONS = [
  { value: "all", label: "Todos los tipos" },
  { value: "client", label: "Cliente" },
  { value: "distributor", label: "Distribuidor" },
  { value: "serviceCenter", label: "Centro de servicio" },
] as const;

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

function branchSummary(branch: BranchWithRoles, companies: CompanyResponse[]) {
  return formatBranchShort(branch, companies);
}

function clientDistributorSummary(
  branch: BranchWithRoles,
  distributors: DistributorResponse[],
  branches: BranchWithRoles[],
  companies: CompanyResponse[],
): string {
  if (!branch.client?.distributorId) return "—";
  const distributor = distributors.find(
    (d) => d.id === branch.client?.distributorId,
  );
  if (!distributor) return `Distribuidor #${branch.client.distributorId}`;
  return distributorLabel(distributor, branches, companies);
}

export function BranchesManager() {
  const toast = useToast();
  const { user } = useAuth();
  const canCreate = user ? canCreateCatalogRecord(user.role) : false;
  const canModify = user ? canModifyCatalogRecord(user.role) : false;
  const {
    scope,
    loading: scopeLoading,
    error: scopeError,
    refresh: refreshScope,
  } = useCompanyScope();
  const [branches, setBranches] = useState<BranchWithRoles[]>([]);
  const [companies, setCompanies] = useState<CompanyResponse[]>([]);
  const [distributors, setDistributors] = useState<DistributorResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const companiesLoading = scopeLoading;
  const [listError, setListError] = useState<string | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardResumeCompanyId, setWizardResumeCompanyId] = useState<
    number | null
  >(null);
  const [dialog, setDialog] = useState<"edit" | null>(null);
  const [selected, setSelected] = useState<BranchWithRoles | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const filteredBranches = useMemo(() => {
    const q = search.trim().toLowerCase();
    return branches.filter((branch) => {
      if (typeFilter === "client" && !branch.client) return false;
      if (typeFilter === "distributor" && !branch.distributor) return false;
      if (typeFilter === "serviceCenter" && !branch.serviceCenter) {
        return false;
      }
      if (!q) return true;
      const haystack = [
        branch.id,
        companySearchTextById(companies, branch.companyId),
        branch.city,
        branch.state,
        branch.address,
        branch.phone,
        branch.email,
        clientDistributorSummary(branch, distributors, branches, companies),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [branches, search, typeFilter, companies, distributors]);

  const pagination = usePagination(filteredBranches);

  const loadBranches = useCallback(async () => {
    if (!scope) return;

    const companyList = scope.companies;
    setLoading(true);
    setListError(null);
    try {
      const [branchRows, distributorRows, clientRows, serviceCenterRows] =
        await Promise.all([
          fetchBranches(),
          fetchDistributors(),
          fetchClients(),
          fetchServiceCenters(),
        ]);

      const merged = mergeBranchesWithRoles(
        branchRows,
        distributorRows,
        clientRows,
        serviceCenterRows,
      );

      setDistributors(distributorRows);

      // ADMIN/DISTRIBUTOR: el API ya devuelve el alcance correcto; no filtrar por
      // scope.branches (queda obsoleto tras crear una sucursal nueva).
      const scopedMerged =
        canBrowseOtherCompanies(scope.role)
          ? merged
          : merged.filter((b) =>
              scope.branches.some((allowed) => allowed.id === b.id),
            );

      setBranches(
        scopedMerged.sort((a, b) => {
          const companyCmp = companyNameById(
            companyList,
            a.companyId,
          ).localeCompare(companyNameById(companyList, b.companyId), "es");
          if (companyCmp !== 0) return companyCmp;
          return `${a.city} ${a.state}`.localeCompare(
            `${b.city} ${b.state}`,
            "es",
          );
        }),
      );
    } catch (err) {
      const message =
        getBranchesErrorMessage(err) || getBranchRolesErrorMessage(err);
      setListError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [scope, toast]);

  const refreshAll = useCallback(async () => {
    await refreshScope();
  }, [refreshScope]);

  useEffect(() => {
    if (scopeLoading) return;

    if (!scope) {
      setLoading(false);
      setCompanies([]);
      setBranches([]);
      if (scopeError) {
        setListError(scopeError);
      }
      return;
    }

    setCompanies(
      [...scope.companies].sort((a, b) =>
        (a.businessName || "").localeCompare(b.businessName || "", "es"),
      ),
    );
    if (scopeError) {
      setListError((prev) => prev ?? scopeError);
    }
    void loadBranches();
  }, [scopeLoading, scope, scopeError, loadBranches]);

  function openCreate() {
    setSelected(null);
    setFormError(null);
    setWizardResumeCompanyId(null);
    setWizardOpen(true);
  }

  function closeWizard() {
    setWizardOpen(false);
    setFormError(null);
    setWizardResumeCompanyId(null);
  }

  function openEdit(branch: BranchWithRoles) {
    setSelected(branch);
    setFormError(null);
    setDialog("edit");
  }

  function closeDialog() {
    setDialog(null);
    setSelected(null);
    setFormError(null);
  }

  async function handleWizardSubmit(values: BranchWizardValues) {
    if (!canCreate) {
      setFormError(CATALOG_CREATE_FORBIDDEN_MESSAGE);
      return;
    }

    setSaving(true);
    setFormError(null);
    const label = `${values.city}, ${values.state}`;

    let companyCreatedInThisSubmit = false;
    let companyId: number | null =
      wizardResumeCompanyId ?? values.linkedCompanyId ?? null;

    try {

      if (companyId == null) {
        const existing = values.rif
          ? findCompanyByRif(companies, values.rif)
          : undefined;
        if (existing) {
          companyId = existing.id;
        } else {
          const company = await createCompany({
            rif: values.rif,
            businessName: values.businessName,
            contributorType: values.contributorType,
          });
          if (!company?.id) {
            throw new Error(
              "El servidor no devolvió la empresa creada. Revisa el listado de empresas.",
            );
          }
          companyId = company.id;
          companyCreatedInThisSubmit = true;
        }
      }

      if (!Number.isFinite(companyId) || companyId <= 0) {
        throw new Error("No se pudo determinar la empresa para la sucursal.");
      }

      const created = await createBranch({
        companyId,
        city: values.city.trim(),
        state: values.state.trim(),
        address: values.address.trim() || undefined,
        phone: values.phone.trim() || undefined,
        email: values.email.trim() || undefined,
      });

      if (!created?.id) {
        throw new Error(
          "El servidor no devolvió la sucursal creada. Revisa el listado o intenta de nuevo.",
        );
      }

      await syncBranchRoles(created.id, null, {
        isClient: values.isClient,
        isDistributor: values.isDistributor,
        isServiceCenter: values.isServiceCenter,
        clientDistributorId: values.clientDistributorId,
      });

      const companyLabel =
        companies.find((c) => c.id === companyId)?.businessName ??
        values.businessName;
      toast.success(
        companyCreatedInThisSubmit
          ? `Empresa "${companyLabel}" y sucursal "${label}" creadas correctamente.`
          : `Sucursal "${label}" creada correctamente.`,
        { href: branchPath(created.id) },
      );
      closeWizard();
      await refreshScope();
    } catch (err) {
      const message =
        getCompaniesErrorMessage(err) ||
        getBranchesErrorMessage(err) ||
        getBranchRolesErrorMessage(err);

      if (companyCreatedInThisSubmit) {
        const resumeId =
          typeof companyId === "number" && companyId > 0 ? companyId : null;
        if (resumeId != null) {
          setWizardResumeCompanyId(resumeId);
        }
        await refreshScope();
        const partial = `La empresa se creó, pero la sucursal no: ${message}. Revisa los datos de ubicación y pulsa «Crear sucursal» de nuevo (la empresa ya está vinculada).`;
        setFormError(partial);
        toast.error(partial);
      } else {
        setFormError(message);
        toast.error(message);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit(values: BranchFormValues) {
    if (!canModify) {
      setFormError(CATALOG_MODIFY_FORBIDDEN_MESSAGE);
      return;
    }

    setSaving(true);
    setFormError(null);
    const body = toBranchRequest(values);
    const roles = toRoleFormState(values);
    const label = `${values.city}, ${values.state}`;

    try {
      if (selected) {
        await updateBranch(selected.id, body);
        await syncBranchRoles(selected.id, selected, roles);
        toast.success(`Sucursal "${label}" actualizada.`, {
          href: branchPath(selected.id),
        });
      }
      closeDialog();
      await refreshScope();
    } catch (err) {
      const message =
        getBranchesErrorMessage(err) || getBranchRolesErrorMessage(err);
      setFormError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(branch: BranchWithRoles, fromDialog = false) {
    if (!canModify) {
      toast.error(CATALOG_MODIFY_FORBIDDEN_MESSAGE);
      return;
    }
    const label = branchSummary(branch, companies);
    if (
      !window.confirm(
        `¿Eliminar la sucursal "${label}"? Se quitarán también sus roles (cliente, distribuidor, centro de servicio) si existen.`,
      )
    ) {
      return;
    }
    setDeletingId(branch.id);
    try {
      await deleteBranchRoles(branch);
      await deleteBranch(branch.id);
      if (fromDialog) closeDialog();
      await loadBranches();
      toast.success(`Sucursal "${label}" eliminada.`);
    } catch (err) {
      const message =
        getBranchesErrorMessage(err) || getBranchRolesErrorMessage(err);
      setListError(message);
      toast.error(message);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:flex-nowrap md:items-center md:justify-between md:gap-4">
        <p className="min-w-0 flex-1 text-sm text-muted">
          Solo un administrador puede crear, editar o eliminar sucursales. El
          listado muestra las empresas y sucursales a las que tienes acceso.
        </p>
        <div className="flex w-full shrink-0 flex-col gap-2 max-md:w-full md:w-auto md:flex-row md:flex-nowrap">
          <button
            type="button"
            onClick={refreshAll}
            disabled={loading || companiesLoading}
            className="inline-flex w-full shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-border bg-card md:w-auto px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-foreground/5 disabled:opacity-50"
          >
            <RefreshCw
              className={cn(
                "size-4",
                (loading || companiesLoading) && "animate-spin",
              )}
            />
            Actualizar
          </button>
          {canCreate && (
            <button
              type="button"
              onClick={openCreate}
              disabled={companiesLoading || companies.length === 0}
              className="inline-flex w-full shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-accent px-3 py-2 md:w-auto text-sm font-medium text-accent-foreground disabled:opacity-50"
            >
              <Plus className="size-4" />
              Nueva sucursal
            </button>
          )}
        </div>
      </div>

      {companies.length === 0 && !companiesLoading && (
        <p className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
          Crea al menos una empresa antes de registrar sucursales.
        </p>
      )}

      {listError && (
        <p
          role="alert"
          className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300"
        >
          {listError}
        </p>
      )}

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-muted">
            <Loader2 className="size-5 animate-spin" />
            Cargando sucursales…
          </div>
        ) : branches.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted">
            No hay sucursales registradas.
          </p>
        ) : (
          <>
            <DataTableToolbar
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder="Buscar por empresa, RIF, ciudad, distribuidor…"
              resultCount={filteredBranches.length}
              totalCount={branches.length}
              filters={[
                {
                  id: "type",
                  label: "Tipo",
                  value: typeFilter,
                  onChange: setTypeFilter,
                  options: TYPE_FILTER_OPTIONS.map((o) => ({
                    value: o.value,
                    label: o.label,
                  })),
                },
              ]}
            />
            {filteredBranches.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted">
                No hay resultados con los filtros aplicados.
              </p>
            ) : (
              <>
                <TableScroll>
                  <table className="w-full min-w-[1040px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-border bg-foreground/[0.02] text-muted">
                        <th className="px-5 py-3 font-medium">ID</th>
                        <th className="px-5 py-3 font-medium">Empresa</th>
                        <th className="px-5 py-3 font-medium">Ubicación</th>
                        <th className="px-5 py-3 font-medium">Contacto</th>
                        <th className="px-5 py-3 font-medium">Roles</th>
                        <th className="px-5 py-3 font-medium">Distribuidor</th>
                        <th className="px-5 py-3 font-medium text-right">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagination.paginatedItems.map((branch) => (
                        <ClickableTableRow
                          key={branch.id}
                          href={branchPath(branch.id)}
                        >
                          <td className="px-5 py-3.5 text-muted">{branch.id}</td>
                          <td className="max-w-[200px] px-5 py-3.5 has-[[data-expanded=true]]:max-w-none">
                            <TruncatedText
                              href={companyPath(branch.companyId)}
                              maxClassName="max-w-[180px]"
                            >
                              {companyNameById(companies, branch.companyId)}
                            </TruncatedText>
                          </td>
                          <td className="px-5 py-3.5 text-card-foreground">
                            <span className="font-medium">
                              {branch.city}, {branch.state}
                            </span>
                            {branch.address && (
                              <span className="mt-0.5 block truncate text-xs text-muted">
                                {branch.address}
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-muted">
                            {branch.phone && (
                              <span className="block">{branch.phone}</span>
                            )}
                            {branch.email && (
                              <span className="block truncate text-xs">
                                {branch.email}
                              </span>
                            )}
                            {!branch.phone && !branch.email && "—"}
                          </td>
                          <td className="px-5 py-3.5">
                            <BranchTypeBadges branch={branch} />
                          </td>
                          <td className="max-w-[180px] truncate px-5 py-3.5 text-muted">
                            {clientDistributorSummary(
                              branch,
                              distributors,
                              branches,
                              companies,
                            )}
                          </td>
                          <td className="px-5 py-3.5" data-row-click="ignore">
                            <div className="flex justify-end gap-1">
                              <ViewResourceLink
                                href={branchPath(branch.id)}
                                label={`Ver sucursal ${branch.city}, ${branch.state}`}
                              />
                              {canModify && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => openEdit(branch)}
                                    className="rounded-lg p-2 text-muted transition-colors hover:bg-foreground/5 hover:text-foreground"
                                    aria-label="Editar sucursal"
                                  >
                                    <Pencil className="size-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDelete(branch)}
                                    disabled={deletingId === branch.id}
                                    className="rounded-lg p-2 text-muted transition-colors hover:bg-rose-500/10 hover:text-rose-600 disabled:opacity-50"
                                    aria-label="Eliminar sucursal"
                                  >
                                    {deletingId === branch.id ? (
                                      <Loader2 className="size-4 animate-spin" />
                                    ) : (
                                      <Trash2 className="size-4" />
                                    )}
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </ClickableTableRow>
                      ))}
                    </tbody>
                  </table>
                </TableScroll>
            <TablePagination pagination={pagination} />
              </>
            )}
          </>
        )}
      </div>

      <BranchCreateWizardDialog
        open={wizardOpen}
        saving={saving}
        error={formError}
        resumeCompanyId={wizardResumeCompanyId}
        companies={companies}
        branches={branches}
        distributors={distributors}
        companiesLoading={companiesLoading}
        onClose={closeWizard}
        onSubmit={handleWizardSubmit}
      />

      <BranchFormDialog
        mode="edit"
        branch={selected ?? undefined}
        companies={companies}
        branches={branches}
        distributors={distributors}
        companiesLoading={companiesLoading}
        open={dialog === "edit"}
        saving={saving}
        error={formError}
        onClose={closeDialog}
        onSubmit={handleSubmit}
        deleting={Boolean(selected && deletingId === selected.id)}
        onDelete={
          selected && canModify
            ? () => void handleDelete(selected, true)
            : undefined
        }
      />
    </div>
  );
}
