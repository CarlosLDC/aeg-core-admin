"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { ContributorBadge } from "@/components/companies/contributor-badge";
import {
  CompanyFormDialog,
  type CompanyFormValues,
} from "@/components/companies/company-form-dialog";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { EmptyState, TableFilterEmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import {
  PageToolbar,
  pageToolbarButtonClass,
} from "@/components/ui/page-toolbar";
import { useConfirm } from "@/context/confirm-provider";
import { TablePagination } from "@/components/ui/table-pagination";
import {
  TableRowMetaCells,
  TableRowMetaHeaders,
} from "@/components/ui/table-meta-column-slots";
import { useAuth } from "@/context/auth-provider";
import { useCompanyScope } from "@/context/company-scope-provider";
import { useToast } from "@/context/toast-provider";
import { reportListTableError } from "@/lib/api-error-message";
import { usePagination } from "@/hooks/use-pagination";
import { useTableColumnVisibility } from "@/hooks/use-table-column-visibility";
import {
  compareDateValues,
  compareNumberValues,
  sortTableRows,
  toggleTableSort,
  type TableSortState,
} from "@/lib/table-sort";
import { CONTRIBUTOR_LABELS } from "@/lib/contributor-types";
import {
  canCreateCatalogRecord,
  canUpdateCompanyRecord,
  CATALOG_MODIFY_FORBIDDEN_MESSAGE,
} from "@/lib/api-permissions";
import {
  createCompany,
  deleteCompany,
  getCompaniesErrorMessage,
  updateCompany,
} from "@/lib/companies-api";
import { CONTRIBUTOR_TYPES, type CompanyResponse } from "@/types/company";
import { cn } from "@/lib/utils";
import { TableScroll } from "@/components/ui/table-scroll";
import { TruncatedText } from "@/components/ui/truncated-text";
import { companyPath } from "@/lib/resource-routes";
import { ClickableTableRow } from "@/components/ui/clickable-table-row";
import { TableRowActionsMenu } from "@/components/ui/table-row-actions-menu";

type CompanySortKey = "id" | "createdAt";

export function CompaniesManager() {
  const toast = useToast();
  const confirm = useConfirm();
  const { user } = useAuth();
  const { scope, loading: scopeLoading, error: scopeError, refresh } =
    useCompanyScope();
  const [companies, setCompanies] = useState<CompanyResponse[]>([]);
  const [listError, setListError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<"create" | "edit" | null>(null);
  const [selected, setSelected] = useState<CompanyResponse | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const tableColumns = useTableColumnVisibility("companies");
  const [search, setSearch] = useState("");
  const [contributorFilter, setContributorFilter] = useState("all");
  const [sort, setSort] = useState<TableSortState<CompanySortKey>>(null);

  const canCreate = user ? canCreateCatalogRecord(user.role) : false;
  const canModify = user ? canUpdateCompanyRecord(user.role) : false;
  const isDistributor = user?.role === "DISTRIBUTOR";

  useEffect(() => {
    if (!scope) return;
    setCompanies(
      [...scope.companies].sort((a, b) =>
        (a.businessName || "").localeCompare(b.businessName || "", "es"),
      ),
    );
    setListError(scopeError);
  }, [scope, scopeError]);

  const filteredCompanies = useMemo(() => {
    const q = search.trim().toLowerCase();
    return companies.filter((company) => {
      if (
        contributorFilter !== "all" &&
        company.contributorType !== contributorFilter
      ) {
        return false;
      }
      if (!q) return true;
      const haystack =
        `${company.id} ${company.businessName} ${company.rif} ${company.contributorType}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [companies, search, contributorFilter]);

  const sortedCompanies = useMemo(
    () =>
      sortTableRows(filteredCompanies, sort, {
        id: (a, b) => compareNumberValues(a.id, b.id),
        createdAt: (a, b) => compareDateValues(a.createdAt, b.createdAt),
      }),
    [filteredCompanies, sort],
  );

  const pagination = usePagination(sortedCompanies);

  const reload = useCallback(async () => {
    await refresh();
  }, [refresh]);

  function openCreate() {
    setSelected(null);
    setFormError(null);
    setDialog("create");
  }

  function openEdit(company: CompanyResponse) {
    setSelected(company);
    setFormError(null);
    setDialog("edit");
  }

  function closeDialog() {
    setDialog(null);
    setSelected(null);
    setFormError(null);
  }

  async function handleSubmit(values: CompanyFormValues) {
    if (dialog === "edit" && !canModify) {
      setFormError(CATALOG_MODIFY_FORBIDDEN_MESSAGE);
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      if (dialog === "create") {
        const created = await createCompany(values);
        toast.success(
          `Empresa "${values.businessName || values.rif}" creada correctamente.`,
          { href: companyPath(created.id) },
        );
      } else if (selected) {
        await updateCompany(selected.id, values);
        toast.success(
          `Empresa "${values.businessName || values.rif}" actualizada.`,
          { href: companyPath(selected.id) },
        );
      }
      closeDialog();
      await reload();
    } catch (err) {
      const message = getCompaniesErrorMessage(err);
      setFormError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(company: CompanyResponse, fromDialog = false) {
    const label = company.businessName || company.rif;
    if (!(await confirm({ title: "Confirmar", message: `¿Eliminar "${label}"? Las sucursales vinculadas pueden verse afectadas.`, destructive: true }))) {
      return;
    }
    setDeletingId(company.id);
    try {
      await deleteCompany(company.id);
      if (fromDialog) closeDialog();
      await reload();
      toast.success(`Empresa "${label}" eliminada.`);
    } catch (err) {
      reportListTableError({
        message: getCompaniesErrorMessage(err),
        recordLabel: label,
        setListError,
        toast,
      });
    } finally {
      setDeletingId(null);
    }
  }

  const loading = scopeLoading;

  return (
    <div className="space-y-4">
      <PageToolbar
        actions={
          canCreate ? (
            <button
              type="button"
              onClick={openCreate}
              className={cn(
                pageToolbarButtonClass,
                "bg-accent text-accent-foreground",
              )}
            >
              <Plus className="size-4" />
              Nueva empresa
            </button>
          ) : undefined
        }
      />

      {listError && (
        <ErrorState message={listError} onRetry={reload} retrying={loading} />
      )}

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-muted">
            <Loader2 className="size-5 animate-spin" />
            Cargando empresas…
          </div>
        ) : companies.length === 0 ? (
          <EmptyState
            title={
              isDistributor
                ? "No hay empresas de clientes visibles"
                : "No hay empresas registradas"
            }
            action={
              canCreate ? (
                <button
                  type="button"
                  onClick={openCreate}
                  className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground"
                >
                  <Plus className="size-4" />
                  Crear primera empresa
                </button>
              ) : undefined
            }
          />
        ) : (
          <>
            <DataTableToolbar
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder="Buscar por RIF o razón social…"
              resultCount={filteredCompanies.length}
              totalCount={companies.length}
              filters={[
                {
                  id: "contributor",
                  label: "Contribuyente",
                  value: contributorFilter,
                  onChange: setContributorFilter,
                  options: [
                    { value: "all", label: "Todos" },
                    ...CONTRIBUTOR_TYPES.map((type) => ({
                      value: type,
                      label: CONTRIBUTOR_LABELS[type],
                    })),
                  ],
                },
              ]}
              columns={tableColumns.toolbarColumns}
            />
            {filteredCompanies.length === 0 ? (
              <TableFilterEmptyState />
            ) : (
              <>
                <TableScroll>
                  <table className="w-full min-w-[720px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-border bg-foreground/[0.02] text-muted">
                        <TableRowMetaHeaders
                          showId={tableColumns.showId}
                          showCreatedAt={tableColumns.showCreatedAt}
                          idSort={{
                            sortDirection:
                              sort?.key === "id" ? sort.direction : null,
                            onSortToggle: () =>
                              setSort((current) =>
                                toggleTableSort(current, "id"),
                              ),
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
                        <th className="px-5 py-3 font-medium">RIF</th>
                        <th className="px-5 py-3 font-medium">Razón social</th>
                        <th className="px-5 py-3 font-medium">Contribuyente</th>
                        </TableRowMetaHeaders>
                      </tr>
                    </thead>
                    <tbody>
                      {pagination.paginatedItems.map((company) => (
                        <ClickableTableRow
                          key={company.id}
                          href={companyPath(company.id)}
                        >
                          <TableRowMetaCells
                            showId={tableColumns.showId}
                            showCreatedAt={tableColumns.showCreatedAt}
                            id={company.id}
                            createdAt={company.createdAt}
                            actions={
                              <td className="px-5 py-3.5" data-row-click="ignore">
                                <TableRowActionsMenu
                                  viewHref={companyPath(company.id)}
                                  viewLabel={`Ver empresa ${company.businessName || company.rif}`}
                                  onEdit={
                                    canModify ? () => openEdit(company) : undefined
                                  }
                                  onDelete={
                                    canModify
                                      ? () => handleDelete(company)
                                      : undefined
                                  }
                                  deleting={deletingId === company.id}
                                />
                              </td>
                            }
                          >
                          <td className="px-5 py-3.5 font-mono text-sm text-card-foreground">
                            {company.rif}
                          </td>
                          <td className="max-w-[240px] px-5 py-3.5">
                            <TruncatedText
                              href={companyPath(company.id)}
                              maxClassName="max-w-[220px]"
                            >
                              {company.businessName || "—"}
                            </TruncatedText>
                          </td>
                          <td className="px-5 py-3.5">
                            <ContributorBadge type={company.contributorType} />
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

      {dialog !== null && (
        <CompanyFormDialog
          mode={dialog === "create" ? "create" : "edit"}
          company={selected ?? undefined}
          open={dialog !== null}
          saving={saving}
          error={formError}
          onClose={closeDialog}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}
