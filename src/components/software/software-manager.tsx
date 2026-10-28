"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { SoftwareFormDialog } from "@/components/software/software-form-dialog";
import { ClickableTableRow } from "@/components/ui/clickable-table-row";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { EmptyState, TableFilterEmptyState } from "@/components/ui/empty-state";
import { PageToolbar, pageToolbarButtonClass } from "@/components/ui/page-toolbar";
import { SortableTableHeader } from "@/components/ui/sortable-table-header";
import { TablePagination } from "@/components/ui/table-pagination";
import {
  TableRowMetaCells,
  TableRowMetaHeaders,
} from "@/components/ui/table-meta-column-slots";
import { TableRowActionsMenu } from "@/components/ui/table-row-actions-menu";
import { TableScroll } from "@/components/ui/table-scroll";
import { TruncatedText } from "@/components/ui/truncated-text";
import { useAuth } from "@/context/auth-provider";
import { useConfirm } from "@/context/confirm-provider";
import { useToast } from "@/context/toast-provider";
import { usePagination } from "@/hooks/use-pagination";
import { useTableColumnVisibility } from "@/hooks/use-table-column-visibility";
import { useTableSearch } from "@/hooks/use-table-search";
import { useTableFilter } from "@/hooks/use-table-filter";
import { reportListTableError } from "@/lib/api-error-message";
import {
  canCreateSoftwareRecord,
  canDeleteSoftwareRecord,
  canManageSoftware,
} from "@/lib/api-permissions";
import { fetchCompanies } from "@/lib/companies-api";
import { formatDate } from "@/lib/datetime-form";
import { forbiddenMessage } from "@/lib/permissions/messages";
import { softwarePath } from "@/lib/resource-routes";
import {
  createSoftware,
  deleteSoftware,
  fetchSoftware,
  getSoftwareErrorMessage,
  updateSoftware,
} from "@/lib/software-api";
import {
  toSoftwareRequest,
  type SoftwareFormValues,
} from "@/lib/software-form";
import { filterAllOption } from "@/lib/table-filter-options";
import {
  compareDateValues,
  compareNumberValues,
  sortTableRows,
  toggleTableSort,
  type TableSortState,
} from "@/lib/table-sort";
import { cn } from "@/lib/utils";
import type { CompanyResponse } from "@/types/company";
import type { SoftwareResponse } from "@/types/software";

type SoftwareSortKey = "name" | "version" | "id" | "createdAt";

const TYPE_FILTER_OPTIONS = [
  filterAllOption("Todos los tipos"),
  { value: "own", label: "Propio" },
  { value: "external", label: "Terceros" },
];

function softwareLabel(sw: SoftwareResponse) {
  return `${sw.name} v${sw.version}`.trim();
}

export function SoftwareManager() {
  const toast = useToast();
  const confirm = useConfirm();
  const { user } = useAuth();
  const canCreate = user ? canCreateSoftwareRecord(user.role) : false;
  const canModify = user ? canManageSoftware(user.role) : false;
  const canDelete = user ? canDeleteSoftwareRecord(user.role) : false;

  const [softwares, setSoftwares] = useState<SoftwareResponse[]>([]);
  const [companies, setCompanies] = useState<CompanyResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<"create" | "edit" | null>(null);
  const [selected, setSelected] = useState<SoftwareResponse | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const tableColumns = useTableColumnVisibility("software");
  const [search, setSearch] = useTableSearch("/software");
  const [typeFilter, setTypeFilter] = useTableFilter(
    "/software",
    "type",
    "all",
  );
  const [sort, setSort] = useState<TableSortState<SoftwareSortKey>>(null);

  const filteredSoftwares = useMemo(() => {
    const q = search.trim().toLowerCase();
    return softwares.filter((item) => {
      if (typeFilter === "own" && item.external) return false;
      if (typeFilter === "external" && !item.external) return false;
      if (!q) return true;
      const distHaystack = (item.distributors ?? [])
        .map((d) => `${d.rif} ${d.businessName}`)
        .join(" ");
      const haystack = [
        item.id,
        item.name,
        item.version,
        item.external ? "terceros externo" : "propio",
        item.developerName,
        item.developerRif,
        (item.programmingLanguages ?? []).join(" "),
        (item.operatingSystems ?? []).join(" "),
        distHaystack,
        item.createdAt,
        formatDate(item.createdAt),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [softwares, search, typeFilter]);

  const sortedSoftwares = useMemo(
    () =>
      sortTableRows(filteredSoftwares, sort, {
        id: (a, b) => compareNumberValues(a.id, b.id),
        name: (a, b) => a.name.localeCompare(b.name, "es"),
        version: (a, b) => a.version.localeCompare(b.version, "es"),
        createdAt: (a, b) => compareDateValues(a.createdAt, b.createdAt),
      }),
    [filteredSoftwares, sort],
  );

  const pagination = usePagination(sortedSoftwares, undefined, {
    section: "/software",
  });

  const loadData = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;
    if (!silent) {
      setLoading(true);
      setListError(null);
    }
    try {
      const [swData, companyData] = await Promise.all([
        fetchSoftware(),
        fetchCompanies().catch(() => [] as CompanyResponse[]),
      ]);
      setSoftwares(swData.sort((a, b) => a.name.localeCompare(b.name, "es")));
      setCompanies(companyData);
    } catch (err) {
      reportListTableError({
        message: getSoftwareErrorMessage(err),
        setListError,
        toast,
      });
    } finally {
      if (!silent) setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function openCreate() {
    setSelected(null);
    setFormError(null);
    setDialog("create");
  }

  function openEdit(software: SoftwareResponse) {
    setSelected(software);
    setFormError(null);
    setDialog("edit");
  }

  function closeDialog() {
    setDialog(null);
    setSelected(null);
    setFormError(null);
  }

  async function handleSubmit(values: SoftwareFormValues) {
    if (dialog === "create" && !canCreate) {
      setFormError(forbiddenMessage("create", "software"));
      return;
    }
    if (dialog === "edit" && !canModify) {
      setFormError(forbiddenMessage("update", "software"));
      return;
    }

    const bodyOrError = toSoftwareRequest(values);
    if (typeof bodyOrError === "string") {
      setFormError(bodyOrError);
      return;
    }

    setSaving(true);
    setFormError(null);
    const label = `${bodyOrError.name} v${bodyOrError.version}`;

    try {
      if (dialog === "create") {
        const created = await createSoftware(bodyOrError);
        toast.success(`Software "${label}" creado.`, {
          href: softwarePath(created.id),
        });
      } else if (dialog === "edit" && selected) {
        const updated = await updateSoftware(selected.id, bodyOrError);
        toast.success(`Software "${label}" actualizado.`, {
          href: softwarePath(updated.id),
        });
      }
      closeDialog();
      await loadData({ silent: true });
    } catch (err) {
      const message = getSoftwareErrorMessage(err);
      setFormError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(software: SoftwareResponse) {
    if (!canDelete) {
      toast.error(forbiddenMessage("delete", "software"));
      return;
    }
    const label = softwareLabel(software);
    if (
      !(await confirm({
        title: "Confirmar",
        message: `¿Eliminar el software "${label}"?`,
        destructive: true,
      }))
    ) {
      return;
    }

    setDeletingId(software.id);
    try {
      await deleteSoftware(software.id);
      await loadData({ silent: true });
      toast.success(`Software "${label}" eliminado.`);
    } catch (err) {
      reportListTableError({
        message: getSoftwareErrorMessage(err),
        recordLabel: label,
        setListError,
        toast,
      });
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="admin-content-stack">
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
              Nuevo software
            </button>
          ) : undefined
        }
      />

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
            Cargando softwares…
          </div>
        ) : softwares.length === 0 ? (
          <EmptyState title="No hay softwares registrados." />
        ) : (
          <>
            <DataTableToolbar
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder="Buscar por nombre, versión, desarrollador, distribuidor…"
              resultCount={filteredSoftwares.length}
              totalCount={softwares.length}
              filters={[
                {
                  id: "type",
                  label: "Tipo",
                  value: typeFilter,
                  onChange: setTypeFilter,
                  options: TYPE_FILTER_OPTIONS,
                },
              ]}
              columns={tableColumns.toolbarColumns}
            />
            {filteredSoftwares.length === 0 ? (
              <TableFilterEmptyState />
            ) : (
              <>
                <TableScroll>
                  <table className="w-full min-w-[840px] text-left text-sm">
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
                          <SortableTableHeader
                            label="Software"
                            sortDirection={
                              sort?.key === "name" ? sort.direction : null
                            }
                            onToggle={() =>
                              setSort((current) =>
                                toggleTableSort(current, "name"),
                              )
                            }
                          />
                          <SortableTableHeader
                            label="Versión"
                            sortDirection={
                              sort?.key === "version" ? sort.direction : null
                            }
                            onToggle={() =>
                              setSort((current) =>
                                toggleTableSort(current, "version"),
                              )
                            }
                          />
                          <th className="px-5 py-3 font-medium">Tipo</th>
                          <th className="px-5 py-3 font-medium">
                            Desarrollador
                          </th>
                          <th className="px-5 py-3 font-medium">
                            Distribuidores
                          </th>
                          <th className="px-5 py-3 font-medium">
                            Lenguajes / SO
                          </th>
                        </TableRowMetaHeaders>
                      </tr>
                    </thead>
                    <tbody>
                      {pagination.paginatedItems.map((item) => {
                        const href = softwarePath(item.id);
                        const isDeleting = deletingId === item.id;
                        const distList = item.distributors ?? [];
                        const distSummary =
                          distList.length > 0
                            ? distList
                                .map((d) => d.businessName || d.rif)
                                .join(", ")
                            : "—";
                        const techSummary = [
                          ...(item.programmingLanguages ?? []),
                          ...(item.operatingSystems ?? []),
                        ].join(", ");

                        return (
                          <ClickableTableRow key={item.id} href={href}>
                            <TableRowMetaCells
                              showId={tableColumns.showId}
                              showCreatedAt={tableColumns.showCreatedAt}
                              id={item.id}
                              createdAt={item.createdAt}
                              actions={
                                <td
                                  className="px-5 py-3.5"
                                  data-row-click="ignore"
                                >
                                  <TableRowActionsMenu
                                    viewHref={href}
                                    viewLabel={`Ver software ${softwareLabel(item)}`}
                                    onEdit={
                                      canModify
                                        ? () => openEdit(item)
                                        : undefined
                                    }
                                    onDelete={
                                      canDelete
                                        ? () => handleDelete(item)
                                        : undefined
                                    }
                                    deleting={isDeleting}
                                  />
                                </td>
                              }
                            >
                              <td className="max-w-[200px] px-5 py-3.5 font-medium text-card-foreground">
                                <TruncatedText maxClassName="max-w-[180px]">
                                  {item.name}
                                </TruncatedText>
                              </td>
                              <td className="px-5 py-3.5 font-mono text-card-foreground">
                                {item.version}
                              </td>
                              <td className="px-5 py-3.5">
                                {item.external ? (
                                  <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:text-amber-200">
                                    Terceros
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-800 dark:text-emerald-200">
                                    Propio
                                  </span>
                                )}
                              </td>
                              <td className="max-w-[220px] px-5 py-3.5 text-muted">
                                {item.developerName || item.developerRif ? (
                                  <TruncatedText maxClassName="max-w-[200px]">
                                    {item.developerName && item.developerRif
                                      ? `${item.developerName} (${item.developerRif})`
                                      : (item.developerName ??
                                        item.developerRif ??
                                        "—")}
                                  </TruncatedText>
                                ) : (
                                  "—"
                                )}
                              </td>
                              <td className="max-w-[220px] px-5 py-3.5 text-muted">
                                <TruncatedText maxClassName="max-w-[200px]">
                                  {distSummary}
                                </TruncatedText>
                              </td>
                              <td className="max-w-[220px] px-5 py-3.5 text-muted">
                                <TruncatedText maxClassName="max-w-[200px]">
                                  {techSummary || "—"}
                                </TruncatedText>
                              </td>
                            </TableRowMetaCells>
                          </ClickableTableRow>
                        );
                      })}
                    </tbody>
                  </table>
                </TableScroll>
                <TablePagination pagination={pagination} />
              </>
            )}
          </>
        )}
      </div>

      <SoftwareFormDialog
        mode={dialog === "create" ? "create" : "edit"}
        software={selected ?? undefined}
        open={dialog !== null}
        saving={saving}
        error={formError}
        companies={companies}
        onClose={closeDialog}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
