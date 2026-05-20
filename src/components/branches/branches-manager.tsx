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
import {
  PageToolbar,
  pageToolbarButtonClass,
} from "@/components/ui/page-toolbar";
import { TablePagination } from "@/components/ui/table-pagination";
import {
  TableCreatedAtCell,
  TableCreatedAtHeader,
} from "@/components/ui/table-created-at";
import {
  filterAllOption,
  uniqueFilterOptions,
} from "@/lib/table-filter-options";
import { useAuth } from "@/context/auth-provider";
import {
  canCreateBranchRecord,
  canUpdateBranchRecord,
  CATALOG_CREATE_FORBIDDEN_MESSAGE,
  CATALOG_MODIFY_FORBIDDEN_MESSAGE,
} from "@/lib/api-permissions";
import { useCompanyScope } from "@/context/company-scope-provider";
import { canBrowseOtherCompanies } from "@/lib/company-scope";
import { useToast } from "@/context/toast-provider";
import { useConfirm } from "@/context/confirm-provider";
import { usePagination } from "@/hooks/use-pagination";
import {
  deleteBranchRoles,
  distributorLabel,
  mergeBranchesWithRoles,
  syncBranchRoles,
} from "@/lib/branch-roles";
import {
  companyNameById,
  companySearchTextById,
  formatBranchShort,
} from "@/lib/branches";
import { getCatalogErrorMessage } from "@/lib/api-error-message";
import { deleteBranch, updateBranch } from "@/lib/branches-api";
import {
  createClientOnboarding,
  type ClientOnboardingValues,
} from "@/lib/client-onboarding";
import { toBranchRequest } from "@/lib/branch-request";
import { invalidateCatalogRoles } from "@/lib/catalog-roles-cache";
import type { BranchWithRoles } from "@/types/branch";
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
  const confirm = useConfirm();
  const { user } = useAuth();
  const canCreate = user ? canCreateBranchRecord(user.role) : false;
  const canModify = user ? canUpdateBranchRecord(user.role) : false;
  const {
    scope,
    catalogRoles,
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
  const [stateFilter, setStateFilter] = useState("all");
  const [companyFilter, setCompanyFilter] = useState("all");

  const stateFilterOptions = useMemo(
    () => [
      filterAllOption("Todos los estados"),
      ...uniqueFilterOptions(branches.map((b) => b.state)),
    ],
    [branches],
  );

  const companyFilterOptions = useMemo(
    () => [
      filterAllOption("Todas las empresas"),
      ...companies.map((c) => ({
        value: String(c.id),
        label: c.businessName || c.rif,
        searchText: `${c.rif} ${c.businessName ?? ""}`,
      })),
    ],
    [companies],
  );

  const filteredBranches = useMemo(() => {
    const q = search.trim().toLowerCase();
    return branches.filter((branch) => {
      if (typeFilter === "client" && !branch.client) return false;
      if (typeFilter === "distributor" && !branch.distributor) return false;
      if (typeFilter === "serviceCenter" && !branch.serviceCenter) {
        return false;
      }
      if (stateFilter !== "all" && branch.state !== stateFilter) return false;
      if (
        companyFilter !== "all" &&
        branch.companyId !== Number(companyFilter)
      ) {
        return false;
      }
      if (!q) return true;
      const haystack = [
        branch.id,
        companySearchTextById(companies, branch.companyId),
        branch.city,
        branch.state,
        branch.address,
        branch.contactPersonName,
        branch.phone,
        branch.email,
        clientDistributorSummary(branch, distributors, branches, companies),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [
    branches,
    search,
    typeFilter,
    stateFilter,
    companyFilter,
    companies,
    distributors,
  ]);

  const pagination = usePagination(filteredBranches);

  const loadBranches = useCallback(async () => {
    if (!scope || !catalogRoles) return;

    const companyList = scope.companies;
    setLoading(true);
    setListError(null);
    try {
      const branchRows = scope.branches;
      const merged = mergeBranchesWithRoles(
        branchRows,
        catalogRoles.distributors,
        catalogRoles.clients,
        catalogRoles.serviceCenters,
      );

      setDistributors(catalogRoles.distributors);

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
        getCatalogErrorMessage(err);
      setListError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [scope, catalogRoles, toast]);

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
    if (catalogRoles) {
      void loadBranches();
    }
  }, [scopeLoading, scope, catalogRoles, scopeError, loadBranches]);

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

    const onboardingValues: ClientOnboardingValues = {
      rif: values.rif,
      businessName: values.businessName,
      contributorType: values.contributorType,
      linkedCompanyId: values.linkedCompanyId,
      city: values.city,
      state: values.state,
      address: values.address,
      contactPersonName: values.contactPersonName,
      phone: values.phone,
      email: values.email,
    };

    try {
      const result = await createClientOnboarding({
        values: onboardingValues,
        companies,
        resumeCompanyId: wizardResumeCompanyId,
        roles: {
          isClient: values.isClient,
          isDistributor: values.isDistributor,
          isServiceCenter: values.isServiceCenter,
          clientDistributorId: values.clientDistributorId,
        },
      });

      toast.success(
        result.companyCreated
          ? `Empresa "${result.companyLabel}" y sucursal "${result.branchLabel}" creadas correctamente.`
          : result.companyLinkedExisting
            ? `Sucursal "${result.branchLabel}" añadida a la empresa existente "${result.companyLabel}".`
            : `Sucursal "${result.branchLabel}" creada correctamente.`,
        { href: branchPath(result.branch.id) },
      );
      closeWizard();
      invalidateCatalogRoles();
      await refreshScope();
    } catch (err) {
      const message = getCatalogErrorMessage(err);

      const resumeId =
        err instanceof Error
          ? (err as Error & { resumeCompanyId?: number }).resumeCompanyId
          : undefined;
      if (resumeId != null && wizardResumeCompanyId == null) {
        setWizardResumeCompanyId(resumeId);
        invalidateCatalogRoles();
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
      invalidateCatalogRoles();
      await refreshScope();
    } catch (err) {
      const message =
        getCatalogErrorMessage(err);
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
    if (!(await confirm({ title: "Confirmar", message: `¿Eliminar la sucursal "${label}"? Se quitarán también sus roles (cliente, distribuidor, centro de servicio) si existen.`, destructive: true }))) {
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
        getCatalogErrorMessage(err);
      setListError(message);
      toast.error(message);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <PageToolbar
        actions={
          <>
            <button
              type="button"
              onClick={refreshAll}
              disabled={loading || companiesLoading}
              className={cn(
                pageToolbarButtonClass,
                "border border-border bg-card text-foreground hover:bg-foreground/5 disabled:opacity-50",
              )}
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
                disabled={companiesLoading}
                className={cn(
                  pageToolbarButtonClass,
                  "bg-accent text-accent-foreground disabled:opacity-50",
                )}
              >
                <Plus className="size-4" />
                Nueva sucursal
              </button>
            )}
          </>
        }
      />

      {canCreate && companies.length === 0 && !companiesLoading && (
        <p className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
          Puedes crear la empresa desde el asistente al registrar una sucursal
          (escaneo SENIAT o datos manuales).
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
                {
                  id: "state",
                  label: "Estado",
                  value: stateFilter,
                  onChange: setStateFilter,
                  options: stateFilterOptions,
                },
                {
                  id: "company",
                  label: "Empresa",
                  value: companyFilter,
                  onChange: setCompanyFilter,
                  options: companyFilterOptions,
                  searchable: true,
                  searchPlaceholder: "Buscar empresa o RIF…",
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
                        <th className="px-5 py-3 font-medium">Empresa</th>
                        <th className="px-5 py-3 font-medium">Ubicación</th>
                        <th className="px-5 py-3 font-medium">Contacto</th>
                        <th className="px-5 py-3 font-medium">Roles</th>
                        <th className="px-5 py-3 font-medium">Distribuidor</th>
                        <TableCreatedAtHeader />
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
                          <td className="max-w-[200px] px-5 py-3.5">
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
                            {branch.contactPersonName && (
                              <span className="block font-medium text-card-foreground">
                                {branch.contactPersonName}
                              </span>
                            )}
                            {branch.phone && (
                              <span className="block">{branch.phone}</span>
                            )}
                            {branch.email && (
                              <span className="block truncate text-xs">
                                {branch.email}
                              </span>
                            )}
                            {!branch.contactPersonName &&
                              !branch.phone &&
                              !branch.email &&
                              "—"}
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
                          <TableCreatedAtCell value={branch.createdAt} />
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
