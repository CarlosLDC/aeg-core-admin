"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Plus, RefreshCw } from "lucide-react";
import { BranchTypeBadges } from "@/components/branches/branch-type-badges";
import {
  BranchCreateWizardDialog,
  type BranchWizardValues,
} from "@/components/branches/branch-create-wizard-dialog";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { EmptyState, TableFilterEmptyState } from "@/components/ui/empty-state";
import { TablePagination } from "@/components/ui/table-pagination";
import { useAuth } from "@/context/auth-provider";
import { useCompanyScope } from "@/context/company-scope-provider";
import { useToast } from "@/context/toast-provider";
import { useConfirm } from "@/context/confirm-provider";
import { usePagination } from "@/hooks/use-pagination";
import { useTableColumnVisibility } from "@/hooks/use-table-column-visibility";
import {
  compareDateValues,
  compareNumberValues,
  sortTableRows,
  toggleTableSort,
  type TableSortState,
} from "@/lib/table-sort";
import {
  canCreateBranchRecord,
  canUpdateBranchRecord,
  CATALOG_CREATE_FORBIDDEN_MESSAGE,
  CATALOG_MODIFY_FORBIDDEN_MESSAGE,
} from "@/lib/api-permissions";
import { canBrowseOtherCompanies } from "@/lib/company-scope";
import {
  deleteBranchRoles,
  distributorLabel,
  mergeBranchesWithRoles,
  syncBranchRoles,
} from "@/lib/branch-roles";
import { formatBranchShort } from "@/lib/branches";
import { getCatalogErrorMessage } from "@/lib/api-error-message";
import { toBranchRequest } from "@/lib/branch-request";
import { invalidateCatalogRoles } from "@/lib/catalog-roles-cache";
import { createBranch, deleteBranch, updateBranch } from "@/lib/branches-api";
import { branchPath } from "@/lib/resource-routes";
import { hrefForBranchClientDistributor } from "@/lib/table-foreign-hrefs";
import {
  filterAllOption,
  uniqueStateFilterOptions,
} from "@/lib/table-filter-options";
import { statesMatch } from "@/lib/state-label";
import type { BranchWithRoles } from "@/types/branch";
import type { CompanyResponse } from "@/types/company";
import type { DistributorResponse } from "@/types/branch-role";
import { cn } from "@/lib/utils";
import { TableScroll } from "@/components/ui/table-scroll";
import { TruncatedText } from "@/components/ui/truncated-text";
import { ClickableTableRow } from "@/components/ui/clickable-table-row";
import { TableRowActionsMenu } from "@/components/ui/table-row-actions-menu";
import {
  TableRowMetaCells,
  TableRowMetaHeaders,
} from "@/components/ui/table-meta-column-slots";

const TYPE_FILTER_OPTIONS = [
  { value: "all", label: "Todos los tipos" },
  { value: "client", label: "Cliente" },
  { value: "distributor", label: "Distribuidor" },
  { value: "serviceCenter", label: "Centro de servicio" },
] as const;

type CompanyBranchSortKey = "id" | "createdAt";

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
  if (!distributor) return "Distribuidor desconocido";
  return distributorLabel(distributor, branches, companies);
}

type CompanyBranchesTableProps = {
  companyId: number;
  companies: CompanyResponse[];
};

export function CompanyBranchesTable({
  companyId,
  companies,
}: CompanyBranchesTableProps) {
  const toast = useToast();
  const confirm = useConfirm();
  const { user } = useAuth();
  const canCreate = user ? canCreateBranchRecord(user.role) : false;
  const canModify = user ? canUpdateBranchRecord(user.role) : false;
  const {
    scope,
    catalogRoles,
    loading: scopeLoading,
    refresh: refreshScope,
  } = useCompanyScope();

  const [branches, setBranches] = useState<BranchWithRoles[]>([]);
  const [distributors, setDistributors] = useState<DistributorResponse[]>([]);
  const [allBranches, setAllBranches] = useState<BranchWithRoles[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [stateFilter, setStateFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selected, setSelected] = useState<BranchWithRoles | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const tableColumns = useTableColumnVisibility(`company-branches-${companyId}`);
  const [sort, setSort] = useState<TableSortState<CompanyBranchSortKey>>(null);

  const loadBranches = useCallback(async () => {
    if (!scope || !catalogRoles) return;

    setLoading(true);
    setListError(null);
    try {
      const merged = mergeBranchesWithRoles(
        scope.branches,
        catalogRoles.distributors,
        catalogRoles.clients,
        catalogRoles.serviceCenters,
      );

      const scopedMerged = canBrowseOtherCompanies(scope.role)
        ? merged
        : merged.filter((b) =>
            scope.branches.some((allowed) => allowed.id === b.id),
          );

      const forCompany = scopedMerged
        .filter((b) => b.companyId === companyId)
        .sort((a, b) =>
          `${a.city} ${a.state}`.localeCompare(`${b.city} ${b.state}`, "es"),
        );

      setDistributors(catalogRoles.distributors);
      setAllBranches(scopedMerged);
      setBranches(forCompany);
    } catch (err) {
      const message = getCatalogErrorMessage(err);
      setListError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [scope, catalogRoles, companyId, toast]);

  useEffect(() => {
    if (scopeLoading) return;
    if (!scope) {
      setLoading(false);
      setBranches([]);
      return;
    }
    if (catalogRoles) {
      void loadBranches();
    }
  }, [scopeLoading, scope, catalogRoles, loadBranches]);

  const stateFilterOptions = useMemo(
    () => [
      filterAllOption("Todos los estados"),
      ...uniqueStateFilterOptions(branches.map((b) => b.state)),
    ],
    [branches],
  );

  const filteredBranches = useMemo(() => {
    const q = search.trim().toLowerCase();
    return branches.filter((branch) => {
      if (stateFilter !== "all" && branch.state !== stateFilter) return false;
      if (typeFilter === "client" && !branch.client) return false;
      if (typeFilter === "distributor" && !branch.distributor) return false;
      if (typeFilter === "serviceCenter" && !branch.serviceCenter) {
        return false;
      }
      if (!q) return true;
      const haystack = [
        branch.id,
        branch.city,
        branch.state,
        branch.address,
        branch.contactPersonName,
        branch.phone,
        branch.email,
        clientDistributorSummary(branch, distributors, allBranches, companies),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [branches, search, typeFilter, stateFilter, distributors, allBranches, companies]);

  const sortedBranches = useMemo(
    () =>
      sortTableRows(filteredBranches, sort, {
        id: (a, b) => compareNumberValues(a.id, b.id),
        createdAt: (a, b) => compareDateValues(a.createdAt, b.createdAt),
      }),
    [filteredBranches, sort],
  );

  const pagination = usePagination(sortedBranches);
  const companyOption = useMemo(
    () => companies.find((company) => company.id === companyId),
    [companies, companyId],
  );
  const companyOptions = useMemo(
    () => (companyOption ? [companyOption] : companies),
    [companyOption, companies],
  );

  function openCreate() {
    setSelected(null);
    setFormError(null);
    setDialogOpen(true);
  }

  function openEdit(branch: BranchWithRoles) {
    setSelected(branch);
    setFormError(null);
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setSelected(null);
    setFormError(null);
  }

  async function handleSubmit(values: BranchWizardValues) {
    const isCreate = !selected;
    if (isCreate && !canCreate) {
      setFormError(CATALOG_CREATE_FORBIDDEN_MESSAGE);
      return;
    }
    if (!isCreate && !canModify) {
      setFormError(CATALOG_MODIFY_FORBIDDEN_MESSAGE);
      return;
    }
    setSaving(true);
    setFormError(null);
    const formValues = toBranchFormValues(values);
    const body = toBranchRequest({
      ...formValues,
      companyId: String(companyId),
    });
    const roles = toRoleFormState(formValues);
    const label = `${values.city}, ${values.state}`;

    try {
      if (isCreate) {
        const created = await createBranch(body);
        await syncBranchRoles(created.id, null, roles);
        toast.success(`Sucursal "${label}" creada.`, {
          href: branchPath(created.id),
        });
      } else if (selected) {
        await updateBranch(selected.id, body);
        await syncBranchRoles(selected.id, selected, roles);
        toast.success(`Sucursal "${label}" actualizada.`, {
          href: branchPath(selected.id),
        });
      }
      closeDialog();
      invalidateCatalogRoles();
      await refreshScope();
      await loadBranches();
    } catch (err) {
      const message = getCatalogErrorMessage(err);
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
    const label = formatBranchShort(branch, companies);
    if (
      !(await confirm({
        title: "Confirmar",
        message: `¿Eliminar la sucursal "${label}"? Se quitarán también sus roles si existen.`,
        destructive: true,
      }))
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
      const message = getCatalogErrorMessage(err);
      setListError(message);
      toast.error(message);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-base font-semibold text-card-foreground">
          Sucursales de la empresa
        </h3>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <button
            type="button"
            onClick={() => void loadBranches()}
            disabled={loading || scopeLoading}
            className="inline-flex w-full shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-foreground/5 disabled:opacity-50 sm:w-auto"
          >
            <RefreshCw
              className={cn(
                "size-4",
                (loading || scopeLoading) && "animate-spin",
              )}
            />
            Actualizar
          </button>
          {canCreate && (
            <button
              type="button"
              onClick={openCreate}
              disabled={scopeLoading}
              className="inline-flex w-full shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90 disabled:opacity-50 sm:w-auto"
            >
              <Plus className="size-4" />
              Nueva sucursal
            </button>
          )}
        </div>
      </div>

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
          <EmptyState
            title="Esta empresa no tiene sucursales registradas."
            action={
              canCreate ? (
                <button
                  type="button"
                  onClick={openCreate}
                  disabled={scopeLoading}
                  className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90 disabled:opacity-50"
                >
                  <Plus className="size-4" />
                  Crear sucursal
                </button>
              ) : undefined
            }
          />
        ) : (
          <>
            <DataTableToolbar
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder="Buscar por ciudad, estado, contacto…"
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
                  searchable: true,
                  searchPlaceholder: "Buscar estado…",
                },
              ]}
              columns={tableColumns.toolbarColumns}
            />
            {filteredBranches.length === 0 ? (
              <TableFilterEmptyState />
            ) : (
              <>
                <TableScroll>
                  <table className="w-full min-w-[880px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-border bg-foreground/[0.02] text-muted">
                        <TableRowMetaHeaders
                          showId={tableColumns.showId}
                          showCreatedAt={tableColumns.showCreatedAt}
                          idSort={{
                            sortDirection:
                              sort?.key === "id" ? sort.direction : null,
                            onSortToggle: () =>
                              setSort((current) => toggleTableSort(current, "id")),
                          }}
                          createdAtSort={{
                            sortDirection:
                              sort?.key === "createdAt" ? sort.direction : null,
                            onSortToggle: () =>
                              setSort((current) =>
                                toggleTableSort(current, "createdAt"),
                              ),
                          }}
                          actions={
                            <th className="px-5 py-3 font-medium text-right">
                              Acciones
                            </th>
                          }
                        >
                        <th className="px-5 py-3 font-medium">Ubicación</th>
                        <th className="px-5 py-3 font-medium">Contacto</th>
                        <th className="px-5 py-3 font-medium">Roles</th>
                        <th className="px-5 py-3 font-medium">Distribuidor</th>
                        </TableRowMetaHeaders>
                      </tr>
                    </thead>
                    <tbody>
                      {pagination.paginatedItems.map((branch) => (
                        <ClickableTableRow
                          key={branch.id}
                          href={branchPath(branch.id)}
                        >
                          <TableRowMetaCells
                            showId={tableColumns.showId}
                            showCreatedAt={tableColumns.showCreatedAt}
                            id={branch.id}
                            createdAt={branch.createdAt}
                            actions={
                              <td className="px-5 py-3.5" data-row-click="ignore">
                                <TableRowActionsMenu
                                  viewHref={branchPath(branch.id)}
                                  viewLabel={`Ver sucursal ${branch.city}, ${branch.state}`}
                                  onEdit={
                                    canModify ? () => openEdit(branch) : undefined
                                  }
                                  onDelete={
                                    canModify
                                      ? () => void handleDelete(branch)
                                      : undefined
                                  }
                                  deleting={deletingId === branch.id}
                                />
                              </td>
                            }
                          >
                          <td className="max-w-[240px] px-5 py-3.5 text-card-foreground">
                            <TruncatedText maxClassName="max-w-[220px]">
                              {branch.address
                                ? `${branch.city}, ${branch.state} — ${branch.address}`
                                : `${branch.city}, ${branch.state}`}
                            </TruncatedText>
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
                              <TruncatedText
                                maxClassName="max-w-[200px]"
                                className="text-xs text-muted"
                              >
                                {branch.email}
                              </TruncatedText>
                            )}
                            {!branch.contactPersonName &&
                              !branch.phone &&
                              !branch.email &&
                              "—"}
                          </td>
                          <td className="px-5 py-3.5">
                            <BranchTypeBadges branch={branch} />
                          </td>
                          <td className="max-w-[180px] px-5 py-3.5 text-muted">
                            <TruncatedText
                              href={
                                user
                                  ? hrefForBranchClientDistributor(
                                      branch,
                                      distributors,
                                      user.role,
                                    )
                                  : undefined
                              }
                              maxClassName="max-w-[160px]"
                            >
                              {clientDistributorSummary(
                                branch,
                                distributors,
                                allBranches,
                                companies,
                              )}
                            </TruncatedText>
                          </td>
                          </TableRowMetaCells>
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
        mode={selected ? "edit" : "create"}
        open={dialogOpen}
        saving={saving}
        error={formError}
        initialValues={
          selected ? branchToWizardValues(selected, companyOptions) : null
        }
        resumeCompanyId={selected ? null : companyId}
        companies={companyOptions}
        branches={allBranches}
        distributors={distributors}
        companiesLoading={scopeLoading}
        onClose={closeDialog}
        onSubmit={handleSubmit}
      />
    </section>
  );
}
