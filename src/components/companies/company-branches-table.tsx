"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Pencil, RefreshCw, Trash2 } from "lucide-react";
import { BranchTypeBadges } from "@/components/branches/branch-type-badges";
import {
  BranchFormDialog,
  type BranchFormValues,
} from "@/components/branches/branch-form-dialog";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { TablePagination } from "@/components/ui/table-pagination";
import { useAuth } from "@/context/auth-provider";
import { useCompanyScope } from "@/context/company-scope-provider";
import { useToast } from "@/context/toast-provider";
import { useConfirm } from "@/context/confirm-provider";
import { usePagination } from "@/hooks/use-pagination";
import {
  canUpdateBranchRecord,
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
import { deleteBranch, updateBranch } from "@/lib/branches-api";
import { branchPath } from "@/lib/resource-routes";
import { hrefForBranchClientDistributor } from "@/lib/table-foreign-hrefs";
import {
  filterAllOption,
  uniqueFilterOptions,
} from "@/lib/table-filter-options";
import type { BranchWithRoles } from "@/types/branch";
import type { CompanyResponse } from "@/types/company";
import type { DistributorResponse } from "@/types/branch-role";
import { cn } from "@/lib/utils";
import { TableScroll } from "@/components/ui/table-scroll";
import { TruncatedText } from "@/components/ui/truncated-text";
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
      ...uniqueFilterOptions(branches.map((b) => b.state)),
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

  const pagination = usePagination(filteredBranches);

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

  async function handleSubmit(values: BranchFormValues) {
    if (!canModify || !selected) {
      setFormError(CATALOG_MODIFY_FORBIDDEN_MESSAGE);
      return;
    }

    setSaving(true);
    setFormError(null);
    const body = toBranchRequest(values);
    const roles = toRoleFormState(values);
    const label = `${values.city}, ${values.state}`;

    try {
      await updateBranch(selected.id, body);
      await syncBranchRoles(selected.id, selected, roles);
      toast.success(`Sucursal "${label}" actualizada.`, {
        href: branchPath(selected.id),
      });
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
        <button
          type="button"
          onClick={() => void loadBranches()}
          disabled={loading || scopeLoading}
          className="inline-flex w-full shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-foreground/5 disabled:opacity-50 sm:w-auto"
        >
          <RefreshCw
            className={cn("size-4", (loading || scopeLoading) && "animate-spin")}
          />
          Actualizar
        </button>
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
          <p className="py-16 text-center text-sm text-muted">
            Esta empresa no tiene sucursales registradas.
          </p>
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
                  <table className="w-full min-w-[880px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-border bg-foreground/[0.02] text-muted">
                        <th className="px-5 py-3 font-medium">ID</th>
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
                          <td className="px-5 py-3.5 text-card-foreground">
                            <span className="font-medium">
                              {branch.city}, {branch.state}
                            </span>
                            {branch.address && (
                              <TruncatedText
                                maxClassName="max-w-[240px] mt-0.5 block text-xs text-muted"
                              >
                                {branch.address}
                              </TruncatedText>
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
                              href={hrefForBranchClientDistributor(
                                branch,
                                distributors,
                              )}
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
                                    onClick={() => void handleDelete(branch)}
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

      <BranchFormDialog
        mode="edit"
        branch={selected ?? undefined}
        companies={companies}
        branches={allBranches}
        distributors={distributors}
        companiesLoading={scopeLoading}
        open={dialogOpen}
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
    </section>
  );
}
