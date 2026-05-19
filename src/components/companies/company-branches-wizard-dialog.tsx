"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Pencil,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import { BranchTypeBadges } from "@/components/branches/branch-type-badges";
import {
  BranchFormDialog,
  type BranchFormValues,
} from "@/components/branches/branch-form-dialog";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { useAuth } from "@/context/auth-provider";
import { useCompanyScope } from "@/context/company-scope-provider";
import { useToast } from "@/context/toast-provider";
import { useConfirm } from "@/context/confirm-provider";
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
import {
  deleteBranch,
  fetchBranches,
  updateBranch,
} from "@/lib/branches-api";
import { fetchClients } from "@/lib/clients-api";
import { fetchDistributors } from "@/lib/distributors-api";
import { fetchServiceCenters } from "@/lib/service-centers-api";
import { branchPath } from "@/lib/resource-routes";
import {
  filterAllOption,
  uniqueFilterOptions,
} from "@/lib/table-filter-options";
import type { BranchRequest, BranchWithRoles } from "@/types/branch";
import type { CompanyResponse } from "@/types/company";
import type { DistributorResponse } from "@/types/branch-role";
import { cn } from "@/lib/utils";
import { ViewResourceLink } from "@/components/ui/view-resource-link";
import { formatDate } from "@/lib/datetime-form";

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

type CompanyBranchesWizardDialogProps = {
  companyId: number;
  companies: CompanyResponse[];
  open: boolean;
  onClose: () => void;
};

export function CompanyBranchesWizardDialog({
  companyId,
  companies,
  open,
  onClose,
}: CompanyBranchesWizardDialogProps) {
  const toast = useToast();
  const confirm = useConfirm();
  const { user } = useAuth();
  const canModify = user ? canUpdateBranchRecord(user.role) : false;
  const { scope, loading: scopeLoading, refresh: refreshScope } =
    useCompanyScope();

  const [branches, setBranches] = useState<BranchWithRoles[]>([]);
  const [distributors, setDistributors] = useState<DistributorResponse[]>([]);
  const [allBranches, setAllBranches] = useState<BranchWithRoles[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [stateFilter, setStateFilter] = useState("all");
  const [stepIndex, setStepIndex] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selected, setSelected] = useState<BranchWithRoles | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const loadBranches = useCallback(async () => {
    if (!scope) return;

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

      setDistributors(distributorRows);
      setAllBranches(scopedMerged);
      setBranches(forCompany);
    } catch (err) {
      const message = getCatalogErrorMessage(err);
      setListError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [scope, companyId, toast]);

  useEffect(() => {
    if (!open) return;
    if (scopeLoading) return;
    if (!scope) {
      setLoading(false);
      setBranches([]);
      return;
    }
    void loadBranches();
  }, [open, scopeLoading, scope, loadBranches]);

  useEffect(() => {
    if (!open) {
      setStepIndex(0);
      setSearch("");
      setTypeFilter("all");
      setStateFilter("all");
    }
  }, [open]);

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
      if (typeFilter === "client" && !branch.client) return false;
      if (typeFilter === "distributor" && !branch.distributor) return false;
      if (typeFilter === "serviceCenter" && !branch.serviceCenter) {
        return false;
      }
      if (stateFilter !== "all" && branch.state !== stateFilter) return false;
      if (!q) return true;
      const haystack = [
        branch.city,
        branch.state,
        branch.address,
        branch.phone,
        branch.email,
        clientDistributorSummary(branch, distributors, allBranches, companies),
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
    distributors,
    allBranches,
    companies,
  ]);

  useEffect(() => {
    setStepIndex(0);
  }, [search, typeFilter, stateFilter]);

  useEffect(() => {
    if (stepIndex >= filteredBranches.length && filteredBranches.length > 0) {
      setStepIndex(filteredBranches.length - 1);
    }
  }, [filteredBranches.length, stepIndex]);

  const currentBranch = filteredBranches[stepIndex] ?? null;
  const totalSteps = filteredBranches.length;

  function openEdit(branch: BranchWithRoles) {
    setSelected(branch);
    setFormError(null);
    setDialogOpen(true);
  }

  function closeFormDialog() {
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
      closeFormDialog();
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
      if (fromDialog) closeFormDialog();
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

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="company-branches-wizard-title"
      >
        <button
          type="button"
          className="absolute inset-0 bg-black/50"
          aria-label="Cerrar"
          onClick={onClose}
        />
        <div className="relative flex max-h-[min(90vh,720px)] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-border bg-card shadow-lg">
          <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-5 py-4">
            <div>
              <h2
                id="company-branches-wizard-title"
                className="text-lg font-semibold text-card-foreground"
              >
                Sucursales de la empresa
              </h2>
              <p className="text-sm text-muted">
                {branches.length} sucursal{branches.length !== 1 ? "es" : ""}{" "}
                registrada{branches.length !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void loadBranches()}
                disabled={loading || scopeLoading}
                className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-foreground/5 disabled:opacity-50"
              >
                <RefreshCw
                  className={cn(
                    "size-4",
                    (loading || scopeLoading) && "animate-spin",
                  )}
                />
                Actualizar
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-2 text-muted transition-colors hover:bg-foreground/5 hover:text-foreground"
                aria-label="Cerrar"
              >
                <X className="size-5" />
              </button>
            </div>
          </header>

          {listError && (
            <p
              role="alert"
              className="mx-5 mt-4 rounded-lg border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300"
            >
              {listError}
            </p>
          )}

          <div className="min-h-0 flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-20 text-muted">
                <Loader2 className="size-5 animate-spin" />
                Cargando sucursales…
              </div>
            ) : branches.length === 0 ? (
              <p className="py-20 text-center text-sm text-muted">
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
                  <p className="py-16 text-center text-sm text-muted">
                    No hay resultados con los filtros aplicados.
                  </p>
                ) : currentBranch ? (
                  <div className="space-y-4 px-5 pb-5">
                    <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
                      <button
                        type="button"
                        onClick={() =>
                          setStepIndex((i) => Math.max(0, i - 1))
                        }
                        disabled={stepIndex === 0}
                        className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-sm font-medium disabled:opacity-40"
                      >
                        <ChevronLeft className="size-4" />
                        Anterior
                      </button>
                      <p className="text-center text-sm font-medium text-card-foreground">
                        {currentBranch.city}, {currentBranch.state}
                        <span className="mt-0.5 block text-xs font-normal text-muted">
                          {stepIndex + 1} de {totalSteps}
                        </span>
                      </p>
                      <button
                        type="button"
                        onClick={() =>
                          setStepIndex((i) =>
                            Math.min(totalSteps - 1, i + 1),
                          )
                        }
                        disabled={stepIndex >= totalSteps - 1}
                        className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-sm font-medium disabled:opacity-40"
                      >
                        Siguiente
                        <ChevronRight className="size-4" />
                      </button>
                    </div>

                    <div className="overflow-x-auto pb-1">
                      <div className="flex min-w-[640px] gap-4">
                        <WizardField label="Ubicación">
                          <p className="font-medium text-card-foreground">
                            {currentBranch.city}, {currentBranch.state}
                          </p>
                          {currentBranch.address && (
                            <p className="mt-1 text-sm text-muted">
                              {currentBranch.address}
                            </p>
                          )}
                        </WizardField>
                        <WizardField label="Contacto">
                          {currentBranch.phone && (
                            <p className="text-sm">{currentBranch.phone}</p>
                          )}
                          {currentBranch.email && (
                            <p className="text-sm text-muted">
                              {currentBranch.email}
                            </p>
                          )}
                          {!currentBranch.phone && !currentBranch.email && "—"}
                        </WizardField>
                        <WizardField label="Roles">
                          <BranchTypeBadges branch={currentBranch} />
                        </WizardField>
                        <WizardField label="Distribuidor">
                          <p className="text-sm text-muted">
                            {clientDistributorSummary(
                              currentBranch,
                              distributors,
                              allBranches,
                              companies,
                            )}
                          </p>
                        </WizardField>
                        <WizardField label="Registro">
                          <p className="text-sm text-muted">
                            {formatDate(currentBranch.createdAt)}
                          </p>
                        </WizardField>
                      </div>
                    </div>

                    <div className="flex flex-wrap justify-end gap-2 pt-2">
                      <ViewResourceLink
                        href={branchPath(currentBranch.id)}
                        label={`Ver sucursal ${currentBranch.city}`}
                      />
                      {canModify && (
                        <>
                          <button
                            type="button"
                            onClick={() => openEdit(currentBranch)}
                            className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-foreground/5"
                          >
                            <Pencil className="size-4" />
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDelete(currentBranch)}
                            disabled={deletingId === currentBranch.id}
                            className="inline-flex items-center gap-2 rounded-lg border border-rose-500/30 px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-500/10 disabled:opacity-50"
                          >
                            {deletingId === currentBranch.id ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <Trash2 className="size-4" />
                            )}
                            Eliminar
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </div>
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
        onClose={closeFormDialog}
        onSubmit={handleSubmit}
        deleting={Boolean(selected && deletingId === selected.id)}
        onDelete={
          selected && canModify
            ? () => void handleDelete(selected, true)
            : undefined
        }
      />
    </>
  );
}

function WizardField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-[140px] flex-1 rounded-lg border border-border bg-foreground/[0.02] px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">
        {label}
      </p>
      <div className="mt-2">{children}</div>
    </div>
  );
}
