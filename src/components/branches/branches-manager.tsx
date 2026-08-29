"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { ClientCreateDialog } from "@/components/clients/client-create-dialog";
import {
  ClientEditDialog,
  type ClientEditValues,
} from "@/components/clients/client-edit-dialog";
import { BranchMissingContractNotice } from "@/components/branches/branch-missing-contract-notice";
import { BranchTypeBadges } from "@/components/branches/branch-type-badges";
import {
  BranchCreateWizardDialog,
  type BranchWizardValues,
} from "@/components/branches/branch-create-wizard-dialog";
import { DataTableToolbar, type FilterSelect } from "@/components/ui/data-table-toolbar";
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
  uniqueStateFilterOptions,
} from "@/lib/table-filter-options";
import { statesMatch } from "@/lib/state-label";
import { useAuth } from "@/context/auth-provider";
import {
  canCancelModificationReview,
  canCreateBranchRecord,
  canUpdateBranchRecord,
  CATALOG_CREATE_FORBIDDEN_MESSAGE,
  CATALOG_MODIFY_FORBIDDEN_MESSAGE,
} from "@/lib/api-permissions";
import { useCompanyScope } from "@/context/company-scope-provider";
import { canBrowseOtherCompanies } from "@/lib/company-scope";
import { useToast } from "@/context/toast-provider";
import { useConfirm } from "@/context/confirm-provider";
import { reportListTableError } from "@/lib/api-error-message";
import { useContractPartyCoverage } from "@/hooks/use-contract-party-coverage";
import { useDistributorId } from "@/hooks/use-distributor-id";
import {
  excludeDistributorStaffBranches,
  resolveDistributorStaffBranchId,
} from "@/lib/distributor-scope";
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
import {
  isClientReassignmentRequiredError,
  showClientReassignmentModal,
} from "@/lib/client-reassignment";
import { deleteBranch, updateBranch } from "@/lib/branches-api";
import {
  createClientOnboarding,
  distributorClientRoles,
  type ClientOnboardingValues,
} from "@/lib/client-onboarding";
import { toClientModificationProposedData } from "@/lib/client-form";
import {
  getClientsErrorMessage,
  requestClientDelete,
  requestClientUpdate,
} from "@/lib/clients-api";
import {
  cancelClientModificationRequest,
  getClientModificationRequestsErrorMessage,
} from "@/lib/client-modification-requests-api";
import {
  getCompaniesErrorMessage,
} from "@/lib/companies-api";
import {
  getBranchMissingContractKinds,
  missingContractLabels,
} from "@/lib/branch-contract-coverage";
import {
  branchWizardNeedsContracts,
  createBranchWizardContracts,
  validateBranchWizardContracts,
} from "@/lib/branch-wizard-contracts";
import { can } from "@/lib/permissions/can";
import {
  emptyBranchWizardContractDraft,
} from "@/components/branches/branch-wizard-types";
import type { BranchFormValues } from "@/components/branches/branch-form-dialog";
import type { BranchRoleFormState } from "@/lib/branch-roles";
import {
  branchToWizardValues,
  toBranchFormValues,
  toBranchRoleFormState,
} from "@/lib/branch-form-mappers";
import { toBranchRequest } from "@/lib/branch-request";
import { invalidateCatalogRoles } from "@/lib/catalog-roles-cache";
import type { BranchWithRoles } from "@/types/branch";
import type { ClientResponse, DistributorResponse } from "@/types/branch-role";
import type { CompanyResponse } from "@/types/company";
import { isDistributorPanelRole } from "@/types/user";
import { cn } from "@/lib/utils";
import { TableScroll } from "@/components/ui/table-scroll";
import { TruncatedText } from "@/components/ui/truncated-text";
import {
  branchPath,
} from "@/lib/resource-routes";
import { ClickableTableRow } from "@/components/ui/clickable-table-row";
import { TableRowActionsMenu } from "@/components/ui/table-row-actions-menu";

const TYPE_FILTER_OPTIONS = [
  { value: "all", label: "Todos los tipos" },
  { value: "client", label: "Cliente" },
  { value: "distributor", label: "Distribuidor" },
  { value: "serviceCenter", label: "Centro de servicio" },
] as const;

function isPendingClientReview(client: ClientResponse): boolean {
  return client.reviewStatus === "PENDING_REVIEW";
}

type BranchSortKey = "id" | "createdAt";

function toRoleFormState(values: BranchFormValues): BranchRoleFormState {
  return toBranchRoleFormState(values);
}

function branchSummary(branch: BranchWithRoles, companies: CompanyResponse[]) {
  return formatBranchShort(branch, companies);
}

export function BranchesManager() {
  const toast = useToast();
  const confirm = useConfirm();
  const { user } = useAuth();
  const isTechnician = isDistributorPanelRole(user?.role);
  const distributorId = useDistributorId();
  const canCreateBranch = user ? canCreateBranchRecord(user.role) : false;
  const canCreate = isTechnician ? distributorId != null : canCreateBranch;
  const canModify = user ? canUpdateBranchRecord(user.role) : false;
  const canRequestReview = isTechnician;
  const canCancelReview = user ? canCancelModificationReview(user.role) : false;
  const showClientActions = canRequestReview || canCancelReview;
  const canReadContracts = user ? can(user.role, "contracts", "read") : false;
  const { coverage: contractCoverage } =
    useContractPartyCoverage(canReadContracts);
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
  const [clientCreateOpen, setClientCreateOpen] = useState(false);
  const [clientEditTarget, setClientEditTarget] = useState<{
    branch: BranchWithRoles;
    client: ClientResponse;
  } | null>(null);
  const [resumeBranchId, setResumeBranchId] = useState<number | null>(null);
  const [wizardMode, setWizardMode] = useState<"create" | "edit">("create");
  const [wizardResumeCompanyId, setWizardResumeCompanyId] = useState<
    number | null
  >(null);
  const [selected, setSelected] = useState<BranchWithRoles | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const tableColumns = useTableColumnVisibility("branches");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [stateFilter, setStateFilter] = useState("all");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [sort, setSort] = useState<TableSortState<BranchSortKey>>(null);

  const clients = catalogRoles?.clients ?? [];
  const clientByBranchId = useMemo(
    () => new Map(clients.map((client) => [client.branchId, client])),
    [clients],
  );

  const stateFilterOptions = useMemo(
    () => [
      filterAllOption("Todos los estados"),
      ...uniqueStateFilterOptions(branches.map((b) => b.state)),
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

  const tableFilters = useMemo((): FilterSelect[] => {
    const sharedFilters: FilterSelect[] = [
      {
        id: "state",
        label: "Estado",
        value: stateFilter,
        onChange: setStateFilter,
        options: stateFilterOptions,
        searchable: true,
        searchPlaceholder: "Buscar estado…",
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
    ];
    if (isTechnician) {
      return sharedFilters;
    }
    return [
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
      ...sharedFilters,
    ];
  }, [
    isTechnician,
    typeFilter,
    stateFilter,
    stateFilterOptions,
    companyFilter,
    companyFilterOptions,
  ]);

  const filteredBranches = useMemo(() => {
    const q = search.trim().toLowerCase();
    return branches.filter((branch) => {
      if (!isTechnician) {
        if (typeFilter === "client" && !branch.client) return false;
        if (typeFilter === "distributor" && !branch.distributor) return false;
        if (typeFilter === "serviceCenter" && !branch.serviceCenter) {
          return false;
        }
      }
      if (stateFilter !== "all" && !statesMatch(branch.state, stateFilter)) {
        return false;
      }
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
    isTechnician,
  ]);

  const sortedBranches = useMemo(
    () =>
      sortTableRows(filteredBranches, sort, {
        id: (a, b) => compareNumberValues(a.id, b.id),
        createdAt: (a, b) => compareDateValues(a.createdAt, b.createdAt),
      }),
    [filteredBranches, sort],
  );

  const pagination = usePagination(sortedBranches);

  const loadBranches = useCallback(async (options?: { silent?: boolean }) => {
    if (!scope || !catalogRoles) return;

    const companyList = scope.companies;
    const silent = options?.silent ?? false;
    if (!silent) {
      setLoading(true);
      setListError(null);
    }
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

      const staffBranchId = resolveDistributorStaffBranchId(
        catalogRoles.distributors,
        distributorId,
      );
      const visibleMerged = isTechnician
        ? excludeDistributorStaffBranches(scopedMerged, staffBranchId)
        : scopedMerged;

      setBranches(
        visibleMerged.sort((a, b) => {
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
      reportListTableError({
        message: getCatalogErrorMessage(err),
        setListError,
        toast,
      });
    } finally {
      if (!silent) setLoading(false);
    }
  }, [scope, catalogRoles, toast, isTechnician, distributorId]);

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
    if (isTechnician) {
      setFormError(null);
      setResumeBranchId(null);
      setClientCreateOpen(true);
      return;
    }
    setSelected(null);
    setFormError(null);
    setWizardMode("create");
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
    setWizardMode("edit");
    setWizardResumeCompanyId(null);
    setWizardOpen(true);
  }

  function closeEditWizard() {
    setWizardOpen(false);
    setSelected(null);
    setFormError(null);
  }

  async function handleClientCreate(
    values: ClientOnboardingValues,
    options?: { autoRetry?: boolean; resumeBranchId?: number },
  ) {
    if (!isTechnician || distributorId == null) {
      setFormError(CATALOG_CREATE_FORBIDDEN_MESSAGE);
      return;
    }
    setSaving(true);
    setFormError(null);
    const branchIdForRetry = options?.resumeBranchId ?? resumeBranchId;
    try {
      const result = await createClientOnboarding({
        values,
        companies,
        resumeBranchId: branchIdForRetry ?? undefined,
        roles: distributorClientRoles(distributorId),
      });
      toast.success(
        result.companyLinkedExisting || result.branchLinkedExisting
          ? `Sucursal registrada en "${result.companyLabel}" — ${result.branchLabel}.`
          : `Sucursal "${result.branchLabel}" registrada.`,
        { href: branchPath(result.branch.id) },
      );
      setResumeBranchId(null);
      setClientCreateOpen(false);
      invalidateCatalogRoles();
      await refreshScope();
      await loadBranches({ silent: true });
    } catch (err) {
      if (isClientReassignmentRequiredError(err)) {
        await showClientReassignmentModal(confirm);
        setFormError(null);
        return;
      }
      const resumeId =
        err instanceof Error
          ? (err as Error & { resumeBranchId?: number }).resumeBranchId
          : undefined;
      if (resumeId != null) {
        setResumeBranchId(resumeId);
      }
      const message = getCatalogErrorMessage(err);
      setFormError(message);
    } finally {
      setSaving(false);
    }
  }

  function openClientEdit(branch: BranchWithRoles, client: ClientResponse) {
    setClientEditTarget({ branch, client });
    setFormError(null);
  }

  function closeClientEdit() {
    setClientEditTarget(null);
    setFormError(null);
  }

  async function handleClientEdit(values: ClientEditValues) {
    if (!clientEditTarget || !canRequestReview) {
      setFormError(CATALOG_MODIFY_FORBIDDEN_MESSAGE);
      return;
    }
    const { branch, client } = clientEditTarget;
    const company = companies.find((row) => row.id === branch.companyId);
    if (!company) {
      setFormError("No se encontró la empresa asociada.");
      return;
    }
    if (isPendingClientReview(client)) {
      setFormError("Esta empresa tiene una solicitud pendiente de aprobación.");
      return;
    }

    setSaving(true);
    setFormError(null);
    const label = company.businessName || company.rif;
    try {
      await requestClientUpdate(
        client.id,
        toClientModificationProposedData(values, client.distributorId),
      );
      closeClientEdit();
      invalidateCatalogRoles();
      await refreshScope();
      await loadBranches({ silent: true });
      toast.success(`Solicitud de actualización para "${label}" enviada a revisión.`, {
        href: branchPath(branch.id),
      });
    } catch (err) {
      const message =
        getCompaniesErrorMessage(err) || getClientsErrorMessage(err);
      setFormError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  async function handleClientDelete(branch: BranchWithRoles, client: ClientResponse) {
    if (!canRequestReview) return;
    if (isPendingClientReview(client)) {
      toast.error("Esta empresa ya tiene una solicitud pendiente de aprobación.");
      return;
    }
    const label = companyNameById(companies, branch.companyId);
    if (
      !(await confirm({
        title: "Confirmar",
        message: `¿Eliminar la empresa "${label}"? Un administrador debe aprobar la solicitud.`,
        destructive: true,
      }))
    ) {
      return;
    }
    setDeletingId(branch.id);
    try {
      await requestClientDelete(client.id);
      invalidateCatalogRoles();
      await refreshScope();
      await loadBranches({ silent: true });
      toast.success(`Solicitud de eliminación para "${label}" enviada a revisión.`);
    } catch (err) {
      toast.error(getClientsErrorMessage(err));
    } finally {
      setDeletingId(null);
    }
  }

  async function handleCancelClientReview(
    branch: BranchWithRoles,
    client: ClientResponse,
  ) {
    if (!canCancelReview) return;
    const requestId = client.activeModificationRequestId;
    if (requestId == null) {
      toast.error("No hay una solicitud de revisión activa para cancelar.");
      return;
    }
    const label = companyNameById(companies, branch.companyId);
    if (
      !(await confirm({
        title: "Cancelar revisión",
        message: `¿Retirar la solicitud pendiente de "${label}"? La empresa volverá a estar activa sin cambios.`,
        destructive: true,
        confirmLabel: "Cancelar revisión",
      }))
    ) {
      return;
    }
    setDeletingId(branch.id);
    try {
      await cancelClientModificationRequest(requestId);
      invalidateCatalogRoles();
      await refreshScope();
      await loadBranches({ silent: true });
      toast.success(`Solicitud de revisión para "${label}" cancelada.`);
    } catch (err) {
      toast.error(getClientModificationRequestsErrorMessage(err));
    } finally {
      setDeletingId(null);
    }
  }

  async function handleWizardSubmit(values: BranchWizardValues) {
    setSaving(true);
    setFormError(null);
    try {
      if (wizardMode === "create") {
        if (!canCreate) {
          setFormError(CATALOG_CREATE_FORBIDDEN_MESSAGE);
          return;
        }
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

        const roles: BranchRoleFormState = {
          organizationRole: values.organizationRole,
          isClient: values.isClient,
          clientDistributorId: values.clientDistributorId,
          canWriteAnnualInspection: values.canWriteAnnualInspection,
        };

        if (branchWizardNeedsContracts(roles)) {
          const contractValidation = validateBranchWizardContracts(values, roles);
          if (contractValidation) {
            setFormError(contractValidation);
            return;
          }
        }

        const result = await createClientOnboarding({
          values: onboardingValues,
          companies,
          resumeCompanyId: wizardResumeCompanyId,
          roles,
        });

        let contractNote = "";

        if (branchWizardNeedsContracts(roles)) {
          try {
            const contracts = await createBranchWizardContracts({
              values,
              roles,
              distributorId: result.distributorId,
              serviceCenterId: result.serviceCenterId,
            });
            if (contracts.distributorContractId != null) {
              contractNote = " Contrato de distribuidora registrado.";
            } else if (contracts.serviceCenterContractId != null) {
              contractNote = " Contrato de centro de servicio registrado.";
            }
          } catch (contractErr) {
            const contractMessage =
              contractErr instanceof Error
                ? contractErr.message
                : "No se pudo registrar el contrato.";
            toast.error(
              `Sucursal creada, pero el contrato falló: ${contractMessage}. Complétalo en la ficha de la empresa.`,
              { href: branchPath(result.branch.id) },
            );
            closeWizard();
            invalidateCatalogRoles();
            await refreshScope();
            return;
          }
        }

        const baseMessage = result.branchLinkedExisting
          ? `Sucursal "${result.branchLabel}" actualizada en el catálogo.`
          : `Sucursal "${result.branchLabel}" creada correctamente.`;

        toast.success(`${baseMessage}${contractNote}`, {
          href: branchPath(result.branch.id),
        });
        closeWizard();
      } else {
        if (!selected || !canModify) {
          setFormError(CATALOG_MODIFY_FORBIDDEN_MESSAGE);
          return;
        }
        const formValues = toBranchFormValues(values);
        const body = toBranchRequest(formValues);
        const roles = toRoleFormState(formValues);
        const label = `${values.city}, ${values.state}`;

        await updateBranch(selected.id, body);
        await syncBranchRoles(selected.id, selected, roles);
        toast.success(`Empresa "${label}" actualizada.`, {
          href: branchPath(selected.id),
        });
        closeEditWizard();
      }

      invalidateCatalogRoles();
      await refreshScope();
    } catch (err) {
      const message = getCatalogErrorMessage(err);
      if (wizardMode === "create") {
        const resumeId =
          err instanceof Error
            ? (err as Error & { resumeCompanyId?: number }).resumeCompanyId
            : undefined;
        if (resumeId != null && wizardResumeCompanyId == null) {
          setWizardResumeCompanyId(resumeId);
          invalidateCatalogRoles();
          await refreshScope();
          const partial = `El RIF quedó registrado, pero no se completó el alta: ${message}. Revisa ubicación y pulsa «Crear empresa» de nuevo.`;
          setFormError(partial);
          toast.error(partial);
          return;
        }
      }
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
    if (!(await confirm({ title: "Confirmar", message: `¿Eliminar la empresa "${label}"? Se quitarán también sus roles (cliente, distribuidor, centro de servicio) si existen.`, destructive: true }))) {
      return;
    }
    setDeletingId(branch.id);
    try {
      await deleteBranchRoles(branch);
      await deleteBranch(branch.id);
      if (fromDialog) closeEditWizard();
      await loadBranches({ silent: true });
      toast.success(`Empresa "${label}" eliminada.`);
    } catch (err) {
      reportListTableError({
        message: getCatalogErrorMessage(err),
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
              disabled={companiesLoading}
              className={cn(
                pageToolbarButtonClass,
                "bg-accent text-accent-foreground disabled:opacity-50",
              )}
            >
              <Plus className="size-4" />
              Nueva empresa
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
            Cargando empresas…
          </div>
        ) : branches.length === 0 ? (
          <EmptyState title="No hay empresas registradas." />
        ) : (
          <>
            <DataTableToolbar
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder={
                isTechnician
                  ? "Buscar por empresa, RIF, ciudad…"
                  : "Buscar por empresa, RIF, ciudad, distribuidor…"
              }
              resultCount={filteredBranches.length}
              totalCount={branches.length}
              filters={tableFilters}
              columns={tableColumns.toolbarColumns}
            />
            {filteredBranches.length === 0 ? (
              <TableFilterEmptyState />
            ) : (
              <>
                <TableScroll>
                  <table
                    className={cn(
                      "w-full text-left text-sm",
                      isTechnician ? "min-w-[720px]" : "min-w-[880px]",
                    )}
                  >
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
                            canModify || showClientActions ? (
                              <th className="px-5 py-3 font-medium text-right">
                                Acciones
                              </th>
                            ) : undefined
                          }
                        >
                        <th className="px-5 py-3 font-medium">Razón social</th>
                        <th className="px-5 py-3 font-medium">Ubicación</th>
                        <th className="px-5 py-3 font-medium">Contacto</th>
                        {!isTechnician ? (
                          <th className="px-5 py-3 font-medium">Roles</th>
                        ) : null}
                        </TableRowMetaHeaders>
                      </tr>
                    </thead>
                    <tbody>
                      {pagination.paginatedItems.map((branch) => {
                        const client = clientByBranchId.get(branch.id);
                        const pendingReview =
                          client != null && isPendingClientReview(client);
                        const companyName = companyNameById(
                          companies,
                          branch.companyId,
                        );
                        const missingContractLabelsForBranch =
                          !isTechnician && contractCoverage
                            ? missingContractLabels(
                                getBranchMissingContractKinds(
                                  branch,
                                  contractCoverage,
                                ),
                              )
                            : [];

                        return (
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
                              isTechnician && showClientActions ? (
                                <td className="px-5 py-3.5" data-row-click="ignore">
                                  <TableRowActionsMenu
                                    viewHref={branchPath(branch.id)}
                                    viewLabel={`Ver empresa ${companyName}`}
                                    onEdit={
                                      client != null && !pendingReview
                                        ? () => openClientEdit(branch, client)
                                        : undefined
                                    }
                                    onDelete={
                                      client != null && !pendingReview
                                        ? () =>
                                            void handleClientDelete(branch, client)
                                        : undefined
                                    }
                                    onCancelReview={
                                      client != null &&
                                      canCancelReview &&
                                      pendingReview
                                        ? () =>
                                            void handleCancelClientReview(
                                              branch,
                                              client,
                                            )
                                        : undefined
                                    }
                                    deleting={deletingId === branch.id}
                                  />
                                </td>
                              ) : canModify ? (
                                <td className="px-5 py-3.5" data-row-click="ignore">
                                  <TableRowActionsMenu
                                    viewHref={branchPath(branch.id)}
                                    viewLabel={`Ver empresa ${branch.city}, ${branch.state}`}
                                    onEdit={() => openEdit(branch)}
                                    onDelete={() => handleDelete(branch)}
                                    deleting={deletingId === branch.id}
                                  />
                                </td>
                              ) : undefined
                            }
                          >
                          <td className="max-w-[200px] px-5 py-3.5">
                            <div className="space-y-1">
                              <TruncatedText maxClassName="max-w-[180px]">
                                {companyName}
                              </TruncatedText>
                              {pendingReview ? (
                                <p className="text-xs font-normal text-amber-700 dark:text-amber-300">
                                  En revisión por administrador
                                </p>
                              ) : null}
                            </div>
                          </td>
                          <td className="max-w-[220px] px-5 text-card-foreground">
                            <TruncatedText maxClassName="max-w-[200px]">
                              {branch.address
                                ? `${branch.city}, ${branch.state} — ${branch.address}`
                                : `${branch.city}, ${branch.state}`}
                            </TruncatedText>
                          </td>
                          <td className="max-w-[200px] px-5 text-muted">
                            <TruncatedText maxClassName="max-w-[180px]">
                              {branch.contactPersonName ||
                                branch.phone ||
                                branch.email ||
                                "—"}
                            </TruncatedText>
                          </td>
                          {!isTechnician ? (
                            <td className="px-5 py-3.5">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <BranchTypeBadges branch={branch} />
                                {missingContractLabelsForBranch.length > 0 ? (
                                  <BranchMissingContractNotice
                                    variant="inline"
                                    missingLabels={missingContractLabelsForBranch}
                                  />
                                ) : null}
                              </div>
                            </td>
                          ) : null}
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

      <ClientCreateDialog
        open={clientCreateOpen}
        saving={saving}
        error={formError}
        companies={companies}
        onClose={() => {
          setClientCreateOpen(false);
          setFormError(null);
          setResumeBranchId(null);
        }}
        onSubmit={(values) => void handleClientCreate(values)}
      />

      {clientEditTarget ? (() => {
        const editCompany = companies.find(
          (row) => row.id === clientEditTarget.branch.companyId,
        );
        if (!editCompany) return null;
        return (
          <ClientEditDialog
            open
            saving={saving}
            error={formError}
            company={editCompany}
            branch={clientEditTarget.branch}
            onClose={() => {
              if (!saving) closeClientEdit();
            }}
            onSubmit={(values) => void handleClientEdit(values)}
          />
        );
      })() : null}

      <BranchCreateWizardDialog
        open={wizardOpen}
        mode={wizardMode}
        saving={saving}
        error={formError}
        initialValues={
          wizardMode === "edit" && selected
            ? branchToWizardValues(selected, companies)
            : null
        }
        resumeCompanyId={wizardMode === "create" ? wizardResumeCompanyId : null}
        companies={companies}
        branches={branches}
        distributors={distributors}
        companiesLoading={companiesLoading}
        onClose={wizardMode === "create" ? closeWizard : closeEditWizard}
        onSubmit={handleWizardSubmit}
      />
    </div>
  );
}
