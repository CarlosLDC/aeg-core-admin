"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AppWindow,
  Building2,
  ExternalLink,
  Plus,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { CompanySelect } from "@/components/companies/company-select";
import { SoftwareFormDialog } from "@/components/software/software-form-dialog";
import { DetailField, DetailSection } from "@/components/resource-view/detail-fields";
import { ResourceViewActions } from "@/components/resource-view/resource-view-actions";
import { ResourceViewShell } from "@/components/resource-view/resource-view-shell";
import { useAuth } from "@/context/auth-provider";
import { useConfirm } from "@/context/confirm-provider";
import { useToast } from "@/context/toast-provider";
import { useResourceId } from "@/hooks/use-resource-id";
import {
  canDeleteSoftwareRecord,
  canManageSoftware,
} from "@/lib/api-permissions";
import { fetchCompanies } from "@/lib/companies-api";
import { formatDate } from "@/lib/datetime-form";
import { forbiddenMessage } from "@/lib/permissions/messages";
import { companyPath, softwareListPath, softwarePath } from "@/lib/resource-routes";
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
import type { CompanyResponse } from "@/types/company";
import type { SoftwareResponse } from "@/types/software";

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
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Modal para vincular distribuidor directamente desde el detalle
  const [addDistributorModalOpen, setAddDistributorModalOpen] = useState(false);
  const [distributorToAdd, setDistributorToAdd] = useState("");
  const [addingDistributor, setAddingDistributor] = useState(false);

  const load = useCallback(async () => {
    if (id == null) {
      setError("Identificador de software no válido.");
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
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

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
    if (!software || !canDelete) {
      toast.error(forbiddenMessage("delete", "software"));
      return;
    }

    const label = `${software.name} v${software.version}`;
    if (
      !(await confirm({
        title: "Confirmar eliminación",
        message: `¿Eliminar el software "${label}"? Esta acción no se puede deshacer.`,
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
      toast.success("Distribuidor vinculado exitosamente.");
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
        title: "Desvincular distribuidor",
        message: `¿Desvincular al distribuidor "${name}" de este software?`,
        destructive: true,
      }))
    ) {
      return;
    }

    try {
      const updated = await removeSoftwareDistributor(software.id, distributorId);
      setSoftware(updated);
      toast.success("Distribuidor desvinculado.");
    } catch (err) {
      toast.error(getSoftwareErrorMessage(err));
    }
  }

  if (loading) {
    return (
      <ResourceViewShell
        title="Cargando software…"
        backHref={softwareListPath}
        loading
      >
        <div />
      </ResourceViewShell>
    );
  }

  if (error || !software) {
    return (
      <ResourceViewShell
        title="Software no encontrado"
        backHref={softwareListPath}
      >
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-sm text-destructive">
          {error ?? "Registro no encontrado."}
        </div>
      </ResourceViewShell>
    );
  }

  const label = `${software.name} v${software.version}`;
  const distributors = software.distributors ?? [];
  const availableDistributors = companies.filter(
    (c) => !distributors.some((d) => d.id === c.id),
  );

  return (
    <>
      <ResourceViewShell
        title={software.name}
        subtitle={`Versión ${software.version} · Catálogo fiscal (Art. 46 h SENIAT)`}
        backHref={softwareListPath}
        actions={
          <ResourceViewActions
            onEdit={canModify ? () => setEditOpen(true) : undefined}
            onDelete={canDelete ? handleDelete : undefined}
            deleting={deleting}
          />
        }
      >
        <div className="space-y-6">
          <DetailSection title="Información del software" layout="quad">
            <DetailField label="Nombre del programa" value={software.name} />
            <DetailField label="Versión" value={`v${software.version}`} />
            <DetailField
              label="Tipo de desarrollo"
              value={
                software.external ? (
                  <span className="inline-flex items-center rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                    Desarrollo de terceros
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    Desarrollo propio AEG
                  </span>
                )
              }
            />
            <DetailField
              label="Fecha de registro"
              value={formatDate(software.createdAt)}
            />
          </DetailSection>

          <DetailSection title="Fabricante / Desarrollador (Art. 46 h)" layout="quad">
            <DetailField
              label="Empresa desarrolladora"
              value={
                software.developerCompanyId ? (
                  <Link
                    href={companyPath(software.developerCompanyId)}
                    className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                  >
                    <Building2 className="size-3.5" />
                    {software.developerName || "Ver empresa"}
                    <ExternalLink className="size-3" />
                  </Link>
                ) : (
                  <span className="italic text-muted">
                    {software.external
                      ? "Sin empresa asignada"
                      : "AEG (Fabricante oficial)"}
                  </span>
                )
              }
            />
            <DetailField
              label="RIF del desarrollador"
              value={
                software.developerRif ? (
                  <span className="font-mono">{software.developerRif}</span>
                ) : (
                  <span className="italic text-muted">—</span>
                )
              }
            />
          </DetailSection>

          <DetailSection title="Especificaciones técnicas" layout="quad">
            <DetailField
              label="Lenguajes de programación"
              value={
                software.programmingLanguages && software.programmingLanguages.length > 0 ? (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {software.programmingLanguages.map((lang) => (
                      <span
                        key={lang}
                        className="rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                      >
                        {lang}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="italic text-muted">No especificado</span>
                )
              }
            />
            <DetailField
              label="Sistemas operativos compatibles"
              value={
                software.operatingSystems && software.operatingSystems.length > 0 ? (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {software.operatingSystems.map((os) => (
                      <span
                        key={os}
                        className="rounded border border-border bg-card px-2 py-0.5 text-xs font-medium text-card-foreground shadow-sm"
                      >
                        {os}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="italic text-muted">No especificado</span>
                )
              }
            />
          </DetailSection>

          {/* Sección de Distribuidores autorizados del software */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-base font-semibold text-card-foreground flex items-center gap-2">
                  <Users className="size-4 text-primary" />
                  Distribuidores autorizados del software (Art. 46 h)
                </h3>
                <p className="mt-0.5 text-xs text-muted">
                  Empresas autorizadas por el fabricante para la comercialización y distribución de este programa.
                </p>
              </div>
              {canModify && (
                <button
                  type="button"
                  onClick={() => setAddDistributorModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-card-foreground hover:bg-foreground/5 shadow-sm self-start sm:self-auto"
                >
                  <Plus className="size-3.5" />
                  Vincular distribuidor
                </button>
              )}
            </div>

            {distributors.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted">
                No hay distribuidores registrados para este software.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-border bg-foreground/[0.02] text-xs font-medium text-muted uppercase">
                    <tr>
                      <th className="px-4 py-2.5">RIF</th>
                      <th className="px-4 py-2.5">Razón social / Distribuidor</th>
                      {canModify && (
                        <th className="w-16 px-4 py-2.5 text-right">Acción</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {distributors.map((dist) => (
                      <tr
                        key={dist.id}
                        className="transition-colors hover:bg-foreground/[0.02]"
                      >
                        <td className="px-4 py-3 font-mono text-xs text-card-foreground">
                          <Link
                            href={companyPath(dist.id)}
                            className="text-primary hover:underline inline-flex items-center gap-1"
                          >
                            {dist.rif}
                            <ExternalLink className="size-3" />
                          </Link>
                        </td>
                        <td className="px-4 py-3 font-medium text-card-foreground">
                          {dist.businessName || "Empresa registrada"}
                        </td>
                        {canModify && (
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() =>
                                handleRemoveDistributor(
                                  dist.id,
                                  dist.businessName || dist.rif,
                                )
                              }
                              title="Desvincular distribuidor"
                              className="rounded p-1 text-muted hover:bg-destructive/10 hover:text-destructive transition-colors"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </ResourceViewShell>

      {/* Modal para vincular distribuidor directamente */}
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
            onClick={() => setAddDistributorModalOpen(false)}
          />
          <div className="relative w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-semibold text-card-foreground">
                  Vincular distribuidor
                </h3>
                <p className="mt-1 text-xs text-muted">
                  Selecciona la empresa distribuidora de este software.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAddDistributorModalOpen(false)}
                className="rounded-lg p-1 text-muted hover:bg-foreground/5"
              >
                <X className="size-4" />
              </button>
            </div>

            <div>
              <CompanySelect
                value={distributorToAdd}
                onChange={setDistributorToAdd}
                companies={availableDistributors}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAddDistributorModalOpen(false)}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-card-foreground hover:bg-foreground/5"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleAddDistributor}
                disabled={!distributorToAdd || addingDistributor}
                className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {addingDistributor ? "Vinculando…" : "Vincular"}
              </button>
            </div>
          </div>
        </div>
      )}

      {editOpen && (
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
    </>
  );
}
