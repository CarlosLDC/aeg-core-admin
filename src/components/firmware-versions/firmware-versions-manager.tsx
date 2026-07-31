"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Loader2, Plus, Trash2 } from "lucide-react";
import {
  FirmwareUploadDialog,
  type FirmwareModelOption,
  type FirmwareUploadValues,
} from "@/components/firmware-versions/firmware-upload-dialog";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { EmptyState, TableFilterEmptyState } from "@/components/ui/empty-state";
import {
  PageToolbar,
  pageToolbarButtonClass,
} from "@/components/ui/page-toolbar";
import { TablePagination } from "@/components/ui/table-pagination";
import {
  TableRowMetaCells,
  TableRowMetaHeaders,
} from "@/components/ui/table-meta-column-slots";
import {
  filterAllOption,
  uniqueFilterOptions,
} from "@/lib/table-filter-options";
import { useAuth } from "@/context/auth-provider";
import { useToast } from "@/context/toast-provider";
import { useConfirm } from "@/context/confirm-provider";
import {
  canCreateFirmwareRecord,
  canDeleteFirmwareRecord,
} from "@/lib/api-permissions";
import { forbiddenMessage } from "@/lib/permissions/messages";
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
import {
  createFirmware,
  deleteFirmware,
  downloadFirmware,
  fetchFirmwares,
  getFirmwaresErrorMessage,
} from "@/lib/firmwares-api";
import { fetchPrinterModels } from "@/lib/printer-models-api";
import type { FirmwareResponse } from "@/types/firmware";
import { cn } from "@/lib/utils";
import { TableScroll } from "@/components/ui/table-scroll";
import { TruncatedText } from "@/components/ui/truncated-text";
import { SortableTableHeader } from "@/components/ui/sortable-table-header";

type FirmwareSortKey = "version" | "sizeBytes" | "id" | "createdAt";

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"] as const;
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unitIndex]}`;
}

function formatFirmwareDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("es-VE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function modelLabel(
  printerModelId: number | null,
  modelMap: Map<number, string>,
): string {
  if (printerModelId == null) return "General";
  return modelMap.get(printerModelId) ?? `Modelo #${printerModelId}`;
}

export function FirmwareVersionsManager() {
  const toast = useToast();
  const confirm = useConfirm();
  const { user } = useAuth();
  const canCreate = user ? canCreateFirmwareRecord(user.role) : false;
  const canDelete = user ? canDeleteFirmwareRecord(user.role) : false;

  const [firmwares, setFirmwares] = useState<FirmwareResponse[]>([]);
  const [modelOptions, setModelOptions] = useState<FirmwareModelOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const tableColumns = useTableColumnVisibility("firmware-versions");
  const [search, setSearch] = useState("");
  const [modelFilter, setModelFilter] = useState("all");
  const [sort, setSort] = useState<TableSortState<FirmwareSortKey>>(null);

  const modelMap = useMemo(() => {
    const map = new Map<number, string>();
    for (const opt of modelOptions) {
      map.set(opt.id, opt.label);
    }
    return map;
  }, [modelOptions]);

  const modelFilterOptions = useMemo(() => {
    const labels = firmwares.map((fw) =>
      modelLabel(fw.printerModelId, modelMap),
    );
    return [
      filterAllOption("Todos los modelos"),
      ...uniqueFilterOptions(labels),
    ];
  }, [firmwares, modelMap]);

  const filteredFirmwares = useMemo(() => {
    const q = search.trim().toLowerCase();
    return firmwares.filter((fw) => {
      const model = modelLabel(fw.printerModelId, modelMap);
      if (modelFilter !== "all" && model !== modelFilter) return false;
      if (!q) return true;
      const haystack = [
        fw.id,
        fw.version,
        fw.fileName,
        fw.checksumSha256,
        fw.notes,
        model,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [firmwares, search, modelFilter, modelMap]);

  const sortedFirmwares = useMemo(
    () =>
      sortTableRows(filteredFirmwares, sort, {
        version: (a, b) => a.version.localeCompare(b.version, "es"),
        sizeBytes: (a, b) => compareNumberValues(a.sizeBytes, b.sizeBytes),
        id: (a, b) => compareNumberValues(a.id, b.id),
        createdAt: (a, b) => compareDateValues(a.createdAt, b.createdAt),
      }),
    [filteredFirmwares, sort],
  );

  const pagination = usePagination(sortedFirmwares);

  const loadFirmwares = useCallback(
    async (options?: { silent?: boolean }) => {
      const silent = options?.silent ?? false;
      if (!silent) {
        setLoading(true);
        setListError(null);
      }
      try {
        const data = await fetchFirmwares();
        setFirmwares(
          [...data].sort((a, b) =>
            compareDateValues(b.createdAt, a.createdAt),
          ),
        );
      } catch (err) {
        reportListTableError({
          message: getFirmwaresErrorMessage(err),
          setListError,
          toast,
        });
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [toast],
  );

  useEffect(() => {
    loadFirmwares();
  }, [loadFirmwares]);

  useEffect(() => {
    let cancelled = false;
    fetchPrinterModels()
      .then((models) => {
        if (cancelled) return;
        setModelOptions(
          [...models]
            .sort((a, b) => {
              const brandCmp = a.brand.localeCompare(b.brand, "es");
              if (brandCmp !== 0) return brandCmp;
              return a.modelCode.localeCompare(b.modelCode, "es");
            })
            .map((m) => ({
              id: m.id,
              label: `${m.brand} ${m.modelCode}`.trim(),
            })),
        );
      })
      .catch(() => {
        if (!cancelled) setModelOptions([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function openCreate() {
    setFormError(null);
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setFormError(null);
  }

  async function handleSubmit(values: FirmwareUploadValues) {
    if (!canCreate) {
      setFormError(forbiddenMessage("create", "firmwares"));
      return;
    }
    if (!values.file) {
      setFormError("Selecciona un archivo .bin.");
      return;
    }

    setSaving(true);
    setFormError(null);

    try {
      const printerModelId = values.printerModelId
        ? Number(values.printerModelId)
        : null;
      await createFirmware({
        file: values.file,
        version: values.version,
        printerModelId:
          printerModelId != null && Number.isFinite(printerModelId)
            ? printerModelId
            : null,
        notes: values.notes || null,
      });
      toast.success(`Firmware ${values.version} subido correctamente.`);
      closeDialog();
      await loadFirmwares();
    } catch (err) {
      const message = getFirmwaresErrorMessage(err);
      setFormError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDownload(fw: FirmwareResponse) {
    setDownloadingId(fw.id);
    try {
      await downloadFirmware(fw.id, fw.fileName);
    } catch (err) {
      toast.error(getFirmwaresErrorMessage(err));
    } finally {
      setDownloadingId(null);
    }
  }

  async function handleDelete(fw: FirmwareResponse) {
    if (!canDelete) {
      toast.error(forbiddenMessage("delete", "firmwares"));
      return;
    }
    const label = fw.version;
    if (
      !(await confirm({
        title: "Confirmar",
        message: `¿Eliminar el firmware ${label} (${fw.fileName})? El archivo remoto también se borrará.`,
        destructive: true,
      }))
    ) {
      return;
    }
    setDeletingId(fw.id);
    try {
      await deleteFirmware(fw.id);
      await loadFirmwares({ silent: true });
      toast.success(`Firmware ${label} eliminado.`);
    } catch (err) {
      reportListTableError({
        message: getFirmwaresErrorMessage(err),
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
              Subir versión
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
            Cargando firmwares…
          </div>
        ) : firmwares.length === 0 ? (
          <EmptyState title="No hay versiones de firmware registradas." />
        ) : (
          <>
            <DataTableToolbar
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder="Buscar por versión, archivo, checksum…"
              resultCount={filteredFirmwares.length}
              totalCount={firmwares.length}
              filters={[
                {
                  id: "model",
                  label: "Modelo",
                  value: modelFilter,
                  onChange: setModelFilter,
                  options: modelFilterOptions,
                },
              ]}
              columns={tableColumns.toolbarColumns}
            />
            {filteredFirmwares.length === 0 ? (
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
                            <th className="px-5 py-3 text-right font-medium">
                              Acciones
                            </th>
                          }
                        >
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
                          <th className="px-5 py-3 font-medium">Archivo</th>
                          <SortableTableHeader
                            label="Tamaño"
                            sortDirection={
                              sort?.key === "sizeBytes" ? sort.direction : null
                            }
                            onToggle={() =>
                              setSort((current) =>
                                toggleTableSort(current, "sizeBytes"),
                              )
                            }
                          />
                          <th className="px-5 py-3 font-medium">Modelo</th>
                          <th className="px-5 py-3 font-medium">Notas</th>
                          {!tableColumns.showCreatedAt ? (
                            <th className="px-5 py-3 font-medium">Fecha</th>
                          ) : null}
                        </TableRowMetaHeaders>
                      </tr>
                    </thead>
                    <tbody>
                      {pagination.paginatedItems.map((fw) => {
                        const busy =
                          deletingId === fw.id || downloadingId === fw.id;
                        return (
                          <tr
                            key={fw.id}
                            className="border-b border-border/70 last:border-0"
                          >
                            <TableRowMetaCells
                              showId={tableColumns.showId}
                              showCreatedAt={tableColumns.showCreatedAt}
                              id={fw.id}
                              createdAt={fw.createdAt}
                              actions={
                                <td className="px-5 py-3.5">
                                  <div className="flex items-center justify-end gap-1">
                                    <button
                                      type="button"
                                      title="Descargar"
                                      aria-label={`Descargar ${fw.fileName}`}
                                      disabled={busy}
                                      onClick={() => handleDownload(fw)}
                                      className="rounded-lg p-2 text-muted transition-colors hover:bg-foreground/5 hover:text-foreground disabled:opacity-50"
                                    >
                                      {downloadingId === fw.id ? (
                                        <Loader2 className="size-4 animate-spin" />
                                      ) : (
                                        <Download className="size-4" />
                                      )}
                                    </button>
                                    {canDelete ? (
                                      <button
                                        type="button"
                                        title="Eliminar"
                                        aria-label={`Eliminar firmware ${fw.version}`}
                                        disabled={busy}
                                        onClick={() => handleDelete(fw)}
                                        className="rounded-lg p-2 text-muted transition-colors hover:bg-rose-500/10 hover:text-rose-700 disabled:opacity-50 dark:hover:text-rose-300"
                                      >
                                        {deletingId === fw.id ? (
                                          <Loader2 className="size-4 animate-spin" />
                                        ) : (
                                          <Trash2 className="size-4" />
                                        )}
                                      </button>
                                    ) : null}
                                  </div>
                                </td>
                              }
                            >
                              <td className="px-5 py-3.5 font-mono font-medium text-card-foreground">
                                {fw.version}
                              </td>
                              <td
                                className="max-w-[200px] px-5 py-3.5"
                                title={`SHA-256: ${fw.checksumSha256}`}
                              >
                                <TruncatedText maxClassName="max-w-[180px]">
                                  {fw.fileName}
                                </TruncatedText>
                              </td>
                              <td className="px-5 py-3.5 text-muted">
                                {formatBytes(fw.sizeBytes)}
                              </td>
                              <td className="max-w-[160px] px-5 py-3.5 text-muted">
                                <TruncatedText maxClassName="max-w-[140px]">
                                  {modelLabel(fw.printerModelId, modelMap)}
                                </TruncatedText>
                              </td>
                              <td className="max-w-[180px] px-5 py-3.5 text-muted">
                                <TruncatedText maxClassName="max-w-[160px]">
                                  {fw.notes || "—"}
                                </TruncatedText>
                              </td>
                              {!tableColumns.showCreatedAt ? (
                                <td className="px-5 py-3.5 text-muted">
                                  {formatFirmwareDate(fw.createdAt)}
                                </td>
                              ) : null}
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

      <FirmwareUploadDialog
        open={dialogOpen}
        saving={saving}
        error={formError}
        modelOptions={modelOptions}
        onClose={closeDialog}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
