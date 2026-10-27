"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, Plus } from "lucide-react";
import { AbnormalityFormDialog } from "@/components/abnormalities/abnormality-form-dialog";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { EmptyState, TableFilterEmptyState } from "@/components/ui/empty-state";
import {
  PageToolbar,
  pageToolbarButtonClass,
} from "@/components/ui/page-toolbar";
import { SortableTableHeader } from "@/components/ui/sortable-table-header";
import {
  TableRowMetaCells,
  TableRowMetaHeaders,
} from "@/components/ui/table-meta-column-slots";
import { TablePagination } from "@/components/ui/table-pagination";
import { TableScroll } from "@/components/ui/table-scroll";
import { TruncatedText } from "@/components/ui/truncated-text";
import { useAuth } from "@/context/auth-provider";
import { useToast } from "@/context/toast-provider";
import { useFieldOperationsCatalog } from "@/hooks/use-field-operations-catalog";
import { usePagination } from "@/hooks/use-pagination";
import { useTableColumnVisibility } from "@/hooks/use-table-column-visibility";
import { useTableSearch } from "@/hooks/use-table-search";
import {
  ABNORMALITY_ORIGIN_LABELS,
  ABNORMALITY_TYPE_LABELS,
  toAbnormalityRequest,
  type AbnormalityFormValues,
} from "@/lib/abnormalities";
import {
  createAbnormality,
  fetchAbnormalities,
  getAbnormalitiesErrorMessage,
} from "@/lib/abnormalities-api";
import { reportListTableError } from "@/lib/api-error-message";
import { canCreateAbnormalityRecord } from "@/lib/api-permissions";
import { formatDate } from "@/lib/datetime-form";
import { forbiddenMessage } from "@/lib/permissions/messages";
import { printerPath } from "@/lib/resource-routes";
import { filterAllOption } from "@/lib/table-filter-options";
import {
  compareDateValues,
  compareNumberValues,
  sortTableRows,
  toggleTableSort,
  type TableSortState,
} from "@/lib/table-sort";
import { cn } from "@/lib/utils";
import { ABNORMALITY_TYPES, type AbnormalityResponse } from "@/types/abnormality";

type AbnormalitySortKey = "detectedAt" | "id" | "createdAt";

export function AbnormalitiesManager() {
  const toast = useToast();
  const { user } = useAuth();
  const canCreate = user ? canCreateAbnormalityRecord(user.role) : false;
  const catalog = useFieldOperationsCatalog();

  const [rows, setRows] = useState<AbnormalityResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const tableColumns = useTableColumnVisibility("abnormalities");
  const [search, setSearch] = useTableSearch("/abnormalities");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sort, setSort] = useState<TableSortState<AbnormalitySortKey>>(null);

  const printerLabelById = useMemo(
    () => new Map(catalog.printerOptions.map((p) => [p.value, p.label])),
    [catalog.printerOptions],
  );

  const typeFilterOptions = useMemo(
    () => [
      filterAllOption("Todos los tipos"),
      ...ABNORMALITY_TYPES.map((t) => ({
        value: t,
        label: ABNORMALITY_TYPE_LABELS[t],
      })),
    ],
    [],
  );

  const loadRows = useCallback(async () => {
    try {
      const data = await fetchAbnormalities();
      setRows(data);
      setListError(null);
    } catch (err) {
      reportListTableError({
        message: getAbnormalitiesErrorMessage(err),
        setListError,
        toast,
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    let cancelled = false;
    fetchAbnormalities()
      .then((data) => {
        if (cancelled) return;
        setRows(data);
        setListError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        reportListTableError({
          message: getAbnormalitiesErrorMessage(err),
          setListError,
          toast,
        });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [toast]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (typeFilter !== "all" && row.type !== typeFilter) return false;
      if (!q) return true;
      const printerLabel =
        printerLabelById.get(String(row.printerId)) ?? `#${row.printerId}`;
      const haystack = [
        row.id,
        printerLabel,
        ABNORMALITY_TYPE_LABELS[row.type],
        ABNORMALITY_ORIGIN_LABELS[row.origin],
        row.description,
        formatDate(row.detectedAt),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [rows, search, typeFilter, printerLabelById]);

  const sortedRows = useMemo(
    () =>
      sortTableRows(filteredRows, sort, {
        detectedAt: (a, b) => compareDateValues(a.detectedAt, b.detectedAt),
        id: (a, b) => compareNumberValues(a.id, b.id),
        createdAt: (a, b) => compareDateValues(a.createdAt, b.createdAt),
      }),
    [filteredRows, sort],
  );

  const pagination = usePagination(sortedRows, undefined, {
    section: "/abnormalities",
  });

  async function handleCreate(values: AbnormalityFormValues) {
    if (!canCreate) {
      setFormError(forbiddenMessage("create", "abnormalities"));
      return;
    }
    const bodyOrError = toAbnormalityRequest(values);
    if (typeof bodyOrError === "string") {
      setFormError(bodyOrError);
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      await createAbnormality(bodyOrError);
      toast.success("Anormalidad registrada.");
      setDialogOpen(false);
      await loadRows();
    } catch (err) {
      const message = getAbnormalitiesErrorMessage(err);
      setFormError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="admin-content-stack">
      <PageToolbar
        actions={
          canCreate ? (
            <button
              type="button"
              onClick={() => {
                setFormError(null);
                setDialogOpen(true);
              }}
              className={cn(
                pageToolbarButtonClass,
                "bg-accent text-accent-foreground",
              )}
            >
              <Plus className="size-4" />
              Registrar anormalidad
            </button>
          ) : undefined
        }
      />

      {listError ? (
        <p
          role="alert"
          className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300"
        >
          {listError}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-muted">
            <Loader2 className="size-5 animate-spin" />
            Cargando anormalidades…
          </div>
        ) : rows.length === 0 ? (
          <EmptyState title="No hay anormalidades registradas." />
        ) : (
          <>
            <DataTableToolbar
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder="Buscar por impresora, tipo, origen o descripción…"
              resultCount={filteredRows.length}
              totalCount={rows.length}
              filters={[
                {
                  id: "type",
                  label: "Tipo",
                  value: typeFilter,
                  onChange: setTypeFilter,
                  options: typeFilterOptions,
                },
              ]}
              columns={tableColumns.toolbarColumns}
            />
            {filteredRows.length === 0 ? (
              <TableFilterEmptyState />
            ) : (
              <>
                <TableScroll>
                  <table className="w-full min-w-[860px] text-left text-sm">
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
                        >
                          <th className="px-5 py-3 font-medium">Impresora</th>
                          <th className="px-5 py-3 font-medium">Tipo</th>
                          <SortableTableHeader
                            label="Fecha detección"
                            sortDirection={
                              sort?.key === "detectedAt" ? sort.direction : null
                            }
                            onToggle={() =>
                              setSort((current) =>
                                toggleTableSort(current, "detectedAt"),
                              )
                            }
                          />
                          <th className="px-5 py-3 font-medium">Origen</th>
                          <th className="px-5 py-3 font-medium">Autorizado</th>
                          <th className="px-5 py-3 font-medium">Descripción</th>
                        </TableRowMetaHeaders>
                      </tr>
                    </thead>
                    <tbody>
                      {pagination.paginatedItems.map((row) => {
                        const printerLabel =
                          printerLabelById.get(String(row.printerId)) ??
                          `#${row.printerId}`;
                        return (
                          <tr
                            key={row.id}
                            className="border-b border-border/60 last:border-b-0 hover:bg-foreground/[0.02]"
                          >
                            <TableRowMetaCells
                              showId={tableColumns.showId}
                              showCreatedAt={tableColumns.showCreatedAt}
                              id={row.id}
                              createdAt={row.createdAt}
                            >
                              <td className="max-w-[160px] px-5 py-3.5 font-mono text-card-foreground">
                                <Link
                                  href={printerPath(row.printerId)}
                                  className="hover:underline"
                                >
                                  <TruncatedText
                                    maxClassName="max-w-[140px]"
                                    mono
                                  >
                                    {printerLabel}
                                  </TruncatedText>
                                </Link>
                              </td>
                              <td className="px-5 py-3.5 font-medium text-card-foreground">
                                {ABNORMALITY_TYPE_LABELS[row.type]}
                              </td>
                              <td className="px-5 py-3.5 text-muted">
                                {formatDate(row.detectedAt)}
                              </td>
                              <td className="px-5 py-3.5 text-muted">
                                {ABNORMALITY_ORIGIN_LABELS[row.origin]}
                              </td>
                              <td className="px-5 py-3.5 text-muted">
                                {row.authorized ? "Sí" : "No"}
                              </td>
                              <td className="max-w-[260px] px-5 py-3.5 text-muted">
                                <TruncatedText maxClassName="max-w-[240px]">
                                  {row.description ?? "—"}
                                </TruncatedText>
                              </td>
                            </TableRowMetaCells>
                          </tr>
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

      {dialogOpen ? (
        <AbnormalityFormDialog
          saving={saving}
          error={formError}
          catalogLoading={catalog.loading}
          printerOptions={catalog.printerOptions}
          onClose={() => {
            if (!saving) setDialogOpen(false);
          }}
          onSubmit={(values) => void handleCreate(values)}
        />
      ) : null}
    </div>
  );
}
