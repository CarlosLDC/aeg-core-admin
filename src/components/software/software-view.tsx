"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, X } from "lucide-react";
import { CompanySelect } from "@/components/companies/company-select";
import { SoftwareFormDialog } from "@/components/software/software-form-dialog";
import {
  DetailField,
  DetailSection,
} from "@/components/resource-view/detail-fields";
import { ResourceViewActions } from "@/components/resource-view/resource-view-actions";
import { ResourceViewShell } from "@/components/resource-view/resource-view-shell";
import { ClickableTableRow } from "@/components/ui/clickable-table-row";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { EmptyState, TableFilterEmptyState } from "@/components/ui/empty-state";
import { FieldLabel } from "@/components/ui/field-label";
import { FormDialogFooter } from "@/components/ui/form-dialog-footer";
import { SortableTableHeader } from "@/components/ui/sortable-table-header";
import { TablePagination } from "@/components/ui/table-pagination";
import { TableScroll } from "@/components/ui/table-scroll";
import { TruncatedText } from "@/components/ui/truncated-text";
import { useAuth } from "@/context/auth-provider";
import { useConfirm } from "@/context/confirm-provider";
import { useToast } from "@/context/toast-provider";
import { usePagination } from "@/hooks/use-pagination";
import { useResourceId } from "@/hooks/use-resource-id";
import {
  canDeleteSoftwareRecord,
  canManageSoftware,
} from "@/lib/api-permissions";
import { fetchCompanies } from "@/lib/companies-api";
import { formatDate } from "@/lib/datetime-form";
import { forbiddenMessage } from "@/lib/permissions/messages";
import { canAccessRoute } from "@/lib/permissions/routes";
import {
  companyPath,
  softwareListPath,
  softwarePath,
} from "@/lib/resource-routes";
import {
  addSoftwareDistributor,
  deleteSoftware,
  fetchSoftwareById,
  getSoftwareErrorMessage,
  removeSoftwareDistributor,
  updateSoftware,
} from "@/lib/software-api";
import {
  toSoftwareRequest,
  type SoftwareFormValues,
} from "@/lib/software-form";
import {
  compareNumberValues,
  sortTableRows,
  toggleTableSort,
  type TableSortState,
} from "@/lib/table-sort";
import { cn } from "@/lib/utils";
import type { CompanyResponse } from "@/types/company";
import type { SoftwareResponse } from "@/types/software";

type DistributorSortKey = "id" | "rif" | "businessName";

export function SoftwareView() {
  const id = useResourceId();
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const { user } = useAuth();
  const canModify = user ? canManageSoftware(user.role) : false;
  const canDelete = user ? canDeleteSoftwareRecord(user.role) : false;

  const [software, setSoftware] = useState<SoftwareResponse | null>(null);
  const [companies, setCompanies] = useState<CompanyResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [section, setSection] = useState<"software" | "distributors">(
    "software",
  );
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [addDistributorModalOpen, setAddDistributorModalOpen] = useState(false);
  const [distributorToAdd, setDistributorToAdd] = useState("");
  const [addingDistributor, setAddingDistributor] = useState(false);
  const [distSearch, setDistSearch] = useState("");
  const [distSort, setDistSort] =
    useState<TableSortState<DistributorSortKey>>(null);

  const load = useCallback(async () => {
    if (id == null) {
      setError("ID inválido");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [swData, companyData] = await Promise.all([
        fetchSoftwareById(id),
        fetchCompanies().catch(() => [] as CompanyResponse[]),
      ]);
      setSoftware(swData);
      setCompanies(companyData);
    } catch (err) {
      setError(getSoftwareErrorMessage(err));
      setSoftware(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const distributors = useMemo(
    () => software?.distributors ?? [],
    [software?.distributors],
  );

  const filteredDistributors = useMemo(() => {
    const q = distSearch.trim().toLowerCase();
    if (!q) return distributors;
    return distributors.filter((d) =>
      `${d.id} ${d.rif} ${d.businessName}`.toLowerCase().includes(q),
    );
  }, [distributors, distSearch]);

  const sortedDistributors = useMemo(
    () =>
      sortTableRows(filteredDistributors, distSort, {
        id: (a, b) => compareNumberValues(a.id, b.id),
        rif: (a, b) => a.rif.localeCompare(b.rif, "es"),
        businessName: (a, b) =>
          (a.businessName ?? "").localeCompare(b.businessName ?? "", "es"),
      }),
    [filteredDistributors, distSort],
  );

  const distPagination = usePagination(sortedDistributors);

  const availableDistributors = useMemo(
    () =>
      companies.filter((c) => !distributors.some((d) => d.id === c.id)),
    [companies, distributors],
  );

  async function handleSubmit(values: SoftwareFormValues) {
    if (!software) return;
    if (!canModify) {
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
      const updated = await updateSoftware(software.id, bodyOrError);
      setSoftware(updated);
      toast.success(`Software "${label}" actualizado.`, {
        href: softwarePath(updated.id),
      });
      setEditOpen(false);
    } catch (err) {
      const message = getSoftwareErrorMessage(err);
      setFormError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!software) return;
    if (!canDelete) {
      toast.error(forbiddenMessage("delete", "software"));
      return;
    }

    const label = `${software.name} v${software.version}`;
    if (
      !(await confirm({
        title: "Confirmar",
        message: `¿Eliminar el software "${label}"?`,
        destructive: true,
      }))
    ) {
      return;
    }

    setDeleting(true);
    try {
      await deleteSoftware(software.id);
      toast.success(`Software "${label}" eliminado.`);
      router.push(softwareListPath);
    } catch (err) {
      toast.error(getSoftwareErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  }

  async function handleAddDistributor() {
    if (!software || !distributorToAdd) return;
    const companyId = Number(distributorToAdd);
    if (!companyId || Number.isNaN(companyId)) return;

    setAddingDistributor(true);
    try {
      const updated = await addSoftwareDistributor(software.id, companyId);
      setSoftware(updated);
      toast.success("Distribuidor vinculado.");
      setAddDistributorModalOpen(false);
      setDistributorToAdd("");
    } catch (err) {
      toast.error(getSoftwareErrorMessage(err));
    } finally {
      setAddingDistributor(false);
    }
  }

  async function handleRemoveDistributor(distributorId: number, name: string) {
    if (!software) return;
    if (
      !(await confirm({
        title: "Confirmar",
        message: `¿Desvincular al distribuidor "${name}" de este software?`,
        destructive: true,
      }))
    ) {
      return;
    }

    try {
      const updated = await removeSoftwareDistributor(
        software.id,
        distributorId,
      );
      setSoftware(updated);
      toast.success("Distribuidor desvinculado.");
    } catch (err) {
      toast.error(getSoftwareErrorMessage(err));
    }
  }

  return (
    <ResourceViewShell
      backHref={softwareListPath}
      backLabel="Volver a softwares"
      title={software ? `${software.name} v${software.version}` : "Software"}
      subtitle={software ? `ID #${software.id}` : undefined}
      loading={loading}
      error={error}
      actions={
        software && (canModify || canDelete) ? (
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
        ) : null
      }
    >
      {software && (
        <>
          <div
            role="tablist"
            aria-label="Secciones del software"
            className="inline-flex rounded-lg border border-border bg-card p-1"
          >
            <button
              type="button"
              role="tab"
              aria-selected={section === "software"}
              onClick={() => setSection("software")}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                section === "software"
                  ? "bg-accent text-accent-foreground shadow-sm"
                  : "text-muted hover:bg-foreground/5 hover:text-card-foreground",
              )}
            >
              Software
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={section === "distributors"}
              onClick={() => setSection("distributors")}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                section === "distributors"
                  ? "bg-accent text-accent-foreground shadow-sm"
                  : "text-muted hover:bg-foreground/5 hover:text-card-foreground",
              )}
            >
              Distribuidores ({distributors.length})
            </button>
          </div>

          {section === "software" && (
            <DetailSection title="Datos generales">
              <DetailField
                label="Nombre del software"
                value={software.name}
              />
              <DetailField label="Versión" value={software.version} mono />
              <DetailField
                label="Tipo de desarrollo"
                value={software.external ? "Terceros" : "Propio"}
              />
              <DetailField
                label="Empresa desarrolladora"
                value={software.developerName || "—"}
              />
              <DetailField
                label="RIF desarrollador"
                value={software.developerRif || "—"}
                mono
              />
              <DetailField
                label="Lenguajes de programación"
                value={
                  (software.programmingLanguages ?? []).length > 0
                    ? software.programmingLanguages.join(", ")
                    : "—"
                }
              />
              <DetailField
                label="Sistemas operativos"
                value={
                  (software.operatingSystems ?? []).length > 0
                    ? software.operatingSystems.join(", ")
                    : "—"
                }
              />
              <DetailField
                label="Registrado"
                value={formatDate(software.createdAt)}
              />
            </DetailSection>
          )}

          {section === "distributors" && (
            <section className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="text-base font-semibold text-card-foreground">
                  Distribuidores autorizados
                </h3>
                {canModify && (
                  <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                    <button
                      type="button"
                      onClick={() => {
                        setDistributorToAdd("");
                        setAddDistributorModalOpen(true);
                      }}
                      className="inline-flex w-full shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90 sm:w-auto"
                    >
                      <Plus className="size-4" />
                      Vincular distribuidor
                    </button>
                  </div>
                )}
              </div>

              <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                {distributors.length === 0 ? (
                  <EmptyState
                    title="Este software no tiene distribuidores vinculados."
                    action={
                      canModify ? (
                        <button
                          type="button"
                          onClick={() => {
                            setDistributorToAdd("");
                            setAddDistributorModalOpen(true);
                          }}
                          className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90"
                        >
                          <Plus className="size-4" />
                          Vincular distribuidor
                        </button>
                      ) : undefined
                    }
                  />
                ) : (
                  <>
                    <DataTableToolbar
                      search={distSearch}
                      onSearchChange={setDistSearch}
                      searchPlaceholder="Buscar por RIF o razón social…"
                      resultCount={filteredDistributors.length}
                      totalCount={distributors.length}
                    />
                    {filteredDistributors.length === 0 ? (
                      <TableFilterEmptyState />
                    ) : (
                      <>
                        <TableScroll>
                          <table className="w-full min-w-[560px] text-left text-sm">
                            <thead>
                              <tr className="border-b border-border bg-foreground/[0.02] text-muted">
                                <SortableTableHeader
                                  label="RIF"
                                  sortDirection={
                                    distSort?.key === "rif"
                                      ? distSort.direction
                                      : null
                                  }
                                  onToggle={() =>
                                    setDistSort((current) =>
                                      toggleTableSort(current, "rif"),
                                    )
                                  }
                                />
                                <SortableTableHeader
                                  label="Razón social"
                                  sortDirection={
                                    distSort?.key === "businessName"
                                      ? distSort.direction
                                      : null
                                  }
                                  onToggle={() =>
                                    setDistSort((current) =>
                                      toggleTableSort(current, "businessName"),
                                    )
                                  }
                                />
                                {canModify && (
                                  <th className="px-5 py-3 font-medium text-right">
                                    Acciones
                                  </th>
                                )}
                              </tr>
                            </thead>
                            <tbody>
                              {distPagination.paginatedItems.map((dist) => {
                                const distHref =
                                  user &&
                                  canAccessRoute(
                                    user.role,
                                    companyPath(dist.id),
                                  )
                                    ? companyPath(dist.id)
                                    : undefined;

                                return (
                                  <ClickableTableRow
                                    key={dist.id}
                                    href={distHref ?? softwarePath(software.id)}
                                  >
                                    <td className="px-5 py-3.5 font-mono text-card-foreground">
                                      {dist.rif}
                                    </td>
                                    <td className="px-5 py-3.5 font-medium text-card-foreground">
                                      <TruncatedText maxClassName="max-w-[320px]">
                                        {dist.businessName || "—"}
                                      </TruncatedText>
                                    </td>
                                    {canModify && (
                                      <td
                                        className="px-5 py-3.5 text-right"
                                        data-row-click="ignore"
                                      >
                                        <button
                                          type="button"
                                          onClick={() =>
                                            void handleRemoveDistributor(
                                              dist.id,
                                              dist.businessName || dist.rif,
                                            )
                                          }
                                          title="Desvincular distribuidor"
                                          aria-label={`Desvincular distribuidor ${dist.businessName || dist.rif}`}
                                          className="inline-flex items-center justify-center rounded-lg p-1.5 text-muted transition-colors hover:bg-rose-500/10 hover:text-rose-600"
                                        >
                                          <Trash2 className="size-4" />
                                        </button>
                                      </td>
                                    )}
                                  </ClickableTableRow>
                                );
                              })}
                            </tbody>
                          </table>
                        </TableScroll>
                        <TablePagination pagination={distPagination} />
                      </>
                    )}
                  </>
                )}
              </div>
            </section>
          )}
        </>
      )}

      {addDistributorModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="Cerrar"
            disabled={addingDistributor}
            onClick={() => setAddDistributorModalOpen(false)}
          />
          <div className="relative flex max-h-[min(92vh,100dvh)] w-full max-w-md flex-col overflow-hidden rounded-xl border border-border bg-card shadow-xl">
            <div className="shrink-0 border-b border-border px-4 py-4 sm:px-6">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold text-card-foreground">
                    Vincular distribuidor
                  </h2>
                  <p className="mt-1 text-sm text-muted">
                    Selecciona la empresa autorizada para distribuir este
                    software.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={addingDistributor}
                  onClick={() => setAddDistributorModalOpen(false)}
                  className="shrink-0 rounded-lg p-1.5 text-muted hover:bg-foreground/5 disabled:opacity-50"
                  aria-label="Cerrar"
                >
                  <X className="size-5" />
                </button>
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleAddDistributor();
              }}
              className="flex min-h-0 flex-1 flex-col overflow-hidden"
            >
              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
                <div>
                  <FieldLabel required>Empresa distribuidora</FieldLabel>
                  <CompanySelect
                    value={distributorToAdd}
                    onChange={setDistributorToAdd}
                    companies={availableDistributors}
                    disabled={addingDistributor}
                  />
                </div>
              </div>

              <div className="shrink-0 border-t border-border px-4 py-4 sm:px-6">
                <FormDialogFooter
                  mode="create"
                  createLabel="Vincular"
                  saving={addingDistributor}
                  submitDisabled={!distributorToAdd}
                  onClose={() => setAddDistributorModalOpen(false)}
                />
              </div>
            </form>
          </div>
        </div>
      )}

      {software && (
        <SoftwareFormDialog
          mode="edit"
          software={software}
          open={editOpen}
          saving={saving}
          error={formError}
          companies={companies}
          onClose={() => {
            setEditOpen(false);
            setFormError(null);
          }}
          onSubmit={handleSubmit}
        />
      )}
    </ResourceViewShell>
  );
}
