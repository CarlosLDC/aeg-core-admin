"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { ClientCreateDialog } from "@/components/clients/client-create-dialog";
import {
  ClientEditDialog,
  type ClientEditValues,
} from "@/components/clients/client-edit-dialog";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { EmptyState, TableFilterEmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import {
  PageToolbar,
  pageToolbarButtonClass,
} from "@/components/ui/page-toolbar";
import { TablePagination } from "@/components/ui/table-pagination";
import { useAuth } from "@/context/auth-provider";
import { useCompanyScope } from "@/context/company-scope-provider";
import { useConfirm } from "@/context/confirm-provider";
import { useToast } from "@/context/toast-provider";
import {
  canCancelModificationReview,
  canUpdateBranchRecord,
  canUpdateCompanyRecord,
  CATALOG_MODIFY_FORBIDDEN_MESSAGE,
} from "@/lib/api-permissions";
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
import { useDistributorId } from "@/hooks/use-distributor-id";
import {
  DISTRIBUTOR_SELF_CLIENT_MESSAGE,
  excludeDistributorSelfClients,
  resolveDistributorStaffBranchId,
} from "@/lib/distributor-scope";
import {
  TableRowMetaCells,
  TableRowMetaHeaders,
} from "@/components/ui/table-meta-column-slots";
import {
  filterAllOption,
  uniqueStateFilterOptions,
} from "@/lib/table-filter-options";
import { statesMatch } from "@/lib/state-label";
import { mergeBranchesWithRoles } from "@/lib/branch-roles";
import { fetchBranchById, fetchBranches } from "@/lib/branches-api";
import { companyNameById } from "@/lib/branches";
import {
  createClientOnboarding,
  distributorClientRoles,
  type ClientOnboardingValues,
} from "@/lib/client-onboarding";
import {
  fetchClientByBranchId,
  fetchClients,
  getClientsErrorMessage,
  requestClientDelete,
  requestClientUpdate,
} from "@/lib/clients-api";
import { toClientModificationProposedData } from "@/lib/client-form";
import {
  cancelClientModificationRequest,
  fetchClientModificationRequestById,
  getClientModificationRequestsErrorMessage,
} from "@/lib/client-modification-requests-api";
import type { ClientModificationProposedData } from "@/types/client-modification-request";
import { getCatalogErrorMessage } from "@/lib/api-error-message";
import {
  getCompaniesErrorMessage,
  updateCompany,
} from "@/lib/companies-api";
import { updateBranch } from "@/lib/branches-api";
import { fetchDistributors } from "@/lib/distributors-api";
import { fetchServiceCenters } from "@/lib/service-centers-api";
import { branchPath, clientPath } from "@/lib/resource-routes";
import type { BranchWithRoles } from "@/types/branch";
import type {
  ClientResponse,
  DistributorResponse,
} from "@/types/branch-role";
import type { CompanyResponse } from "@/types/company";
import { cn } from "@/lib/utils";
import { TableScroll } from "@/components/ui/table-scroll";
import { ClickableTableRow } from "@/components/ui/clickable-table-row";
import { TableRowActionsMenu } from "@/components/ui/table-row-actions-menu";
import { TruncatedText } from "@/components/ui/truncated-text";
type ClientListRow = {
  key: number;
  client: ClientResponse;
  branch?: BranchWithRoles;
  businessName: string;
  rif: string;
  city: string;
  state: string;
  phone: string;
  email: string;
  createdAt: string;
};

type ClientSortKey = "id" | "createdAt";

function isPendingReview(client: ClientResponse): boolean {
  return client.reviewStatus === "PENDING_REVIEW";
}

function clientLabel(row: ClientListRow): string {
  return `${row.businessName} (${row.rif})`;
}

function buildClientListRows(
  clients: ClientResponse[],
  distributorId: number,
  branches: BranchWithRoles[],
  companies: CompanyResponse[],
  staffBranchId: number | null,
  proposedByClientId: Map<number, Partial<ClientModificationProposedData>>,
): ClientListRow[] {
  const branchById = new Map(branches.map((b) => [b.id, b]));
  return excludeDistributorSelfClients(
    clients.filter((client) => client.distributorId === distributorId),
    staffBranchId,
  )
    .map((client) => {
      const branch = branchById.get(client.branchId);
      const companyFromScope =
        branch != null
          ? companies.find((c) => c.id === branch.companyId)
          : undefined;
      const proposed = proposedByClientId.get(client.id);
      return {
        key: client.id,
        client,
        branch,
        businessName:
          proposed?.businessName?.trim() ||
          companyFromScope?.businessName?.trim() ||
          client.companyBusinessName?.trim() ||
          (branch != null
            ? companyNameById(companies, branch.companyId)
            : "—"),
        rif:
          proposed?.rif?.trim() ||
          companyFromScope?.rif?.trim() ||
          client.companyRif?.trim() ||
          "—",
        city:
          proposed?.city?.trim() ||
          branch?.city?.trim() ||
          client.branchCity?.trim() ||
          "—",
        state:
          proposed?.state?.trim() ||
          branch?.state?.trim() ||
          client.branchState?.trim() ||
          "—",
        phone:
          proposed?.phone?.trim() ||
          branch?.phone?.trim() ||
          client.branchPhone?.trim() ||
          "—",
        email:
          proposed?.email?.trim() ||
          branch?.email?.trim() ||
          client.branchEmail?.trim() ||
          "—",
        createdAt: branch?.createdAt ?? client.createdAt,
      };
    })
    .sort((a, b) => a.businessName.localeCompare(b.businessName, "es"));
}

export function ClientsManager() {
  const toast = useToast();
  const confirm = useConfirm();
  const { user } = useAuth();
  const canEditCompany = user ? canUpdateCompanyRecord(user.role) : false;
  const canEditBranch = user ? canUpdateBranchRecord(user.role) : false;
  const canRequestReview = user?.role === "TECHNICIAN";
  const canCancelReview = user ? canCancelModificationReview(user.role) : false;
  const canModify = canEditCompany && canEditBranch;
  const showActions = canModify || canRequestReview || canCancelReview;
  const {
    scope,
    loading: scopeLoading,
    error: scopeError,
    refresh: refreshScope,
  } = useCompanyScope();
  const distributorId = useDistributorId();
  const [distributors, setDistributors] = useState<DistributorResponse[]>([]);
  const [clients, setClients] = useState<ClientResponse[]>([]);
  const [proposedByClientId, setProposedByClientId] = useState<
    Map<number, Partial<ClientModificationProposedData>>
  >(new Map());
  const [branches, setBranches] = useState<BranchWithRoles[]>([]);
  const [companies, setCompanies] = useState<CompanyResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selected, setSelected] = useState<ClientListRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [resumeBranchId, setResumeBranchId] = useState<number | null>(null);
  const tableColumns = useTableColumnVisibility("clients");
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState("all");
  const [sort, setSort] = useState<TableSortState<ClientSortKey>>(null);

  const loadClients = useCallback(async (options?: { silent?: boolean }) => {
    if (!scope) return;
    const silent = options?.silent ?? false;
    if (!silent) {
      setLoading(true);
      setListError(null);
    }
    try {
      const [branchRows, distributorRows, clientRows, serviceCenterRows] =
        await Promise.all([
          fetchBranches(),
          fetchDistributors(),
          fetchClients(),
          fetchServiceCenters(),
        ]);
      let merged = mergeBranchesWithRoles(
        branchRows,
        distributorRows,
        clientRows,
        serviceCenterRows,
      );
      const mergedIds = new Set(merged.map((b) => b.id));
      const missingBranchIds = [
        ...new Set(
          clientRows
            .map((c) => c.branchId)
            .filter((id) => !mergedIds.has(id)),
        ),
      ];
      if (missingBranchIds.length > 0) {
        const fetched = await Promise.all(
          missingBranchIds.map((id) =>
            fetchBranchById(id).catch(() => null),
          ),
        );
        const extraBranches = fetched.filter(
          (b): b is NonNullable<typeof b> => b != null,
        );
        if (extraBranches.length > 0) {
          merged = mergeBranchesWithRoles(
            [...branchRows, ...extraBranches],
            distributorRows,
            clientRows,
            serviceCenterRows,
          );
        }
      }
      setClients(clientRows);
      setDistributors(distributorRows);
      setBranches(merged);
      setCompanies(
        [...scope.companies].sort((a, b) =>
          (a.businessName || "").localeCompare(b.businessName || "", "es"),
        ),
      );

      const pendingReviewClients = clientRows.filter(
        (client) =>
          client.reviewStatus === "PENDING_REVIEW" &&
          client.activeModificationRequestId != null,
      );
      if (pendingReviewClients.length === 0) {
        setProposedByClientId(new Map());
      } else {
        const proposals = new Map<
          number,
          Partial<ClientModificationProposedData>
        >();
        await Promise.all(
          pendingReviewClients.map(async (client) => {
            const requestId = client.activeModificationRequestId;
            if (requestId == null) return;
            try {
              const detail =
                await fetchClientModificationRequestById(requestId);
              if (
                detail.actionType === "UPDATE" &&
                detail.proposedData != null
              ) {
                proposals.set(client.id, detail.proposedData);
              }
            } catch {
              /* solicitud no legible */
            }
          }),
        );
        setProposedByClientId(proposals);
      }
    } catch (err) {
      setListError(getCatalogErrorMessage(err));
    } finally {
      if (!silent) setLoading(false);
    }
  }, [scope]);

  useEffect(() => {
    if (scopeLoading || !scope) return;
    void loadClients();
  }, [scopeLoading, scope, loadClients]);

  useEffect(() => {
    if (scopeError) setListError((prev) => prev ?? scopeError);
  }, [scopeError]);

  const distributorStaffBranchId = useMemo(
    () => resolveDistributorStaffBranchId(distributors, distributorId),
    [distributors, distributorId],
  );

  const clientListRows = useMemo(() => {
    if (distributorId == null) return [];
    return buildClientListRows(
      clients,
      distributorId,
      branches,
      companies,
      distributorStaffBranchId,
      proposedByClientId,
    );
  }, [
    clients,
    branches,
    companies,
    distributorId,
    distributorStaffBranchId,
    proposedByClientId,
  ]);

  const stateFilterOptions = useMemo(
    () => [
      filterAllOption("Todos los estados"),
      ...uniqueStateFilterOptions(clientListRows.map((r) => r.state)),
    ],
    [clientListRows],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return clientListRows.filter((row) => {
      if (stateFilter !== "all" && !statesMatch(row.state, stateFilter)) {
        return false;
      }
      if (!q) return true;
      const haystack = [
        row.businessName,
        row.rif,
        row.city,
        row.state,
        row.phone,
        row.email,
        row.branch?.contactPersonName,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [clientListRows, search, stateFilter]);

  const sorted = useMemo(
    () =>
      sortTableRows(filtered, sort, {
        id: (a, b) => compareNumberValues(a.client.id, b.client.id),
        createdAt: (a, b) => compareDateValues(a.createdAt, b.createdAt),
      }),
    [filtered, sort],
  );

  const pagination = usePagination(sorted);

  async function handleCreate(
    values: ClientOnboardingValues,
    options?: { autoRetry?: boolean; resumeBranchId?: number },
  ) {
    if (distributorId == null) {
      setFormError("Tu usuario no tiene una distribuidora vinculada.");
      return;
    }
    setSaving(true);
    setFormError(null);
    const branchIdForRetry = options?.resumeBranchId ?? resumeBranchId;
    if (
      branchIdForRetry != null &&
      branchIdForRetry === distributorStaffBranchId
    ) {
      setFormError(DISTRIBUTOR_SELF_CLIENT_MESSAGE);
      return;
    }
    try {
      const result = await createClientOnboarding({
        values,
        companies,
        resumeBranchId: branchIdForRetry ?? undefined,
        roles: distributorClientRoles(distributorId),
      });
      const linkedParts = [
        result.companyLinkedExisting ? "empresa existente" : null,
        result.branchLinkedExisting ? "empresa existente" : null,
      ].filter(Boolean);
      const linkedHint =
        linkedParts.length > 0 ? ` (${linkedParts.join(", ")})` : "";
      const createdClient = await fetchClientByBranchId(result.branch.id);
      toast.success(
        result.companyLinkedExisting || result.branchLinkedExisting
          ? `Cliente registrado en "${result.companyLabel}" — ${result.branchLabel}${linkedHint}.`
          : `Cliente "${result.companyLabel}" registrado en ${result.branchLabel}.`,
        {
          href: createdClient
            ? clientPath(createdClient.id)
            : branchPath(result.branch.id),
        },
      );
      setResumeBranchId(null);
      setCreateOpen(false);
      await refreshScope();
      await loadClients();
    } catch (err) {
      const resumeId =
        err instanceof Error
          ? (err as Error & { resumeBranchId?: number }).resumeBranchId
          : undefined;
      if (resumeId != null) {
        setResumeBranchId(resumeId);
      }
      const message = getCatalogErrorMessage(err);
      const shouldAutoRetry =
        !options?.autoRetry &&
        resumeId != null &&
        (message.includes("vinculo") ||
          message.includes("vínculo") ||
          message.includes("reintentará") ||
          message.includes("binding property"));
      if (shouldAutoRetry && resumeId != null) {
        setResumeBranchId(resumeId);
        setSaving(false);
        return handleCreate(values, {
          autoRetry: true,
          resumeBranchId: resumeId,
        });
      }
      if (resumeId != null && distributorId != null) {
        try {
          const linked = await fetchClientByBranchId(resumeId);
          if (linked?.distributorId === distributorId) {
            toast.success(
              `Cliente registrado en ${values.city.trim()}, ${values.state.trim()}.`,
              { href: clientPath(linked.id) },
            );
            setResumeBranchId(null);
            setCreateOpen(false);
            await refreshScope();
            await loadClients();
            return;
          }
        } catch {
          /* vínculo aún no legible */
        }
      }
      setFormError(message);
    } finally {
      setSaving(false);
    }
  }

  const canCreate = distributorId != null;

  function openEdit(row: ClientListRow) {
    if (!row.branch) {
      toast.error("No se encontró la empresa asociada a este cliente.");
      return;
    }
    const company = companies.find((c) => c.id === row.branch?.companyId);
    if (!company) {
      toast.error("No se encontró la empresa asociada a este cliente.");
      return;
    }
    setSelected(row);
    setFormError(null);
    setEditOpen(true);
  }

  function closeEditDialog() {
    setEditOpen(false);
    setSelected(null);
    setFormError(null);
  }

  async function handleEdit(values: ClientEditValues) {
    if (!selected?.branch) {
      setFormError(CATALOG_MODIFY_FORBIDDEN_MESSAGE);
      return;
    }
    const company = companies.find((c) => c.id === selected.branch?.companyId);
    if (!company) {
      setFormError("No se encontró la empresa asociada a este cliente.");
      return;
    }
    if (isPendingReview(selected.client)) {
      setFormError("Este cliente tiene una solicitud pendiente de aprobación.");
      return;
    }

    setSaving(true);
    setFormError(null);
    const label = clientLabel(selected);

    try {
      if (canRequestReview) {
        await requestClientUpdate(
          selected.client.id,
          toClientModificationProposedData(values, selected.client.distributorId),
        );
        closeEditDialog();
        await loadClients();
        toast.success(`Solicitud de actualización para "${label}" enviada a revisión.`, {
          href: clientPath(selected.client.id),
        });
        return;
      }
      if (!canModify) {
        setFormError(CATALOG_MODIFY_FORBIDDEN_MESSAGE);
        return;
      }
      await Promise.all([
        updateCompany(company.id, {
          businessName: values.businessName,
          rif: values.rif,
          contributorType: values.contributorType,
        }),
        updateBranch(selected.branch.id, {
          companyId: company.id,
          city: values.city,
          state: values.state,
          address: values.address || undefined,
          contactPersonName: values.contactPersonName.trim() || undefined,
          phone: values.phone || undefined,
          email: values.email || undefined,
        }),
      ]);
      closeEditDialog();
      await loadClients();
      toast.success(`Cliente "${label}" actualizado.`, {
        href: clientPath(selected.client.id),
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

  async function handleCancelReview(row: ClientListRow) {
    if (!canCancelReview) return;
    const requestId = row.client.activeModificationRequestId;
    if (requestId == null) {
      toast.error("No hay una solicitud de revisión activa para cancelar.");
      return;
    }
    const label = clientLabel(row);
    if (
      !(await confirm({
        title: "Cancelar revisión",
        message: `¿Retirar la solicitud pendiente de "${label}"? El cliente volverá a estar activo sin cambios.`,
        destructive: true,
        confirmLabel: "Cancelar revisión",
      }))
    ) {
      return;
    }

    setDeletingId(row.client.id);
    try {
      await cancelClientModificationRequest(requestId);
      await loadClients({ silent: true });
      toast.success(`Solicitud de revisión para "${label}" cancelada.`);
    } catch (err) {
      toast.error(getClientModificationRequestsErrorMessage(err));
    } finally {
      setDeletingId(null);
    }
  }

  async function handleDelete(row: ClientListRow, fromDialog = false) {
    if (!canModify && !canRequestReview) {
      toast.error(CATALOG_MODIFY_FORBIDDEN_MESSAGE);
      return;
    }
    if (isPendingReview(row.client)) {
      toast.error("Este cliente ya tiene una solicitud pendiente de aprobación.");
      return;
    }
    const label = clientLabel(row);
    const message = canRequestReview
      ? `¿Eliminar el cliente "${label}"? Un administrador debe aprobar la solicitud.`
      : `¿Eliminar el cliente "${label}"?`;
    if (!(await confirm({ title: "Confirmar", message, destructive: true }))) {
      return;
    }
    setDeletingId(row.client.id);
    try {
      if (canRequestReview) {
        await requestClientDelete(row.client.id);
      } else {
        toast.error("La eliminación directa de clientes no está disponible.");
        return;
      }
      if (fromDialog) closeEditDialog();
      await loadClients({ silent: true });
      toast.success(`Solicitud de eliminación para "${label}" enviada a revisión.`);
    } catch (err) {
      reportListTableError({
        message: getClientsErrorMessage(err),
        recordLabel: label,
        setListError,
        toast,
      });
    } finally {
      setDeletingId(null);
    }
  }

  const selectedCompany =
    selected?.branch != null
      ? companies.find((c) => c.id === selected.branch?.companyId)
      : undefined;

  return (
    <div className="space-y-4">
      <PageToolbar
        actions={
          canCreate ? (
            <button
              type="button"
              onClick={() => {
                setFormError(null);
                setCreateOpen(true);
              }}
              className={cn(
                pageToolbarButtonClass,
                "bg-accent text-accent-foreground",
              )}
            >
              <Plus className="size-4" />
              Nuevo cliente
            </button>
          ) : undefined
        }
      />

      {listError && (
        <ErrorState
          message={listError}
          onRetry={() => void loadClients()}
          retrying={loading}
        />
      )}

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        {loading || scopeLoading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-muted">
            <Loader2 className="size-5 animate-spin" />
            Cargando clientes…
          </div>
        ) : clientListRows.length === 0 ? (
          <EmptyState
            title="Sin clientes registrados"
            action={
              canCreate ? (
                <button
                  type="button"
                  onClick={() => setCreateOpen(true)}
                  className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground"
                >
                  <Plus className="size-4" />
                  Registrar primer cliente
                </button>
              ) : undefined
            }
          />
        ) : (
          <>
            <DataTableToolbar
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder="Buscar por razón social, RIF, ciudad…"
              resultCount={filtered.length}
              totalCount={clientListRows.length}
              filters={[
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
            {filtered.length === 0 ? (
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
                            showActions ? (
                              <th className="px-5 py-3 font-medium text-right">
                                Acciones
                              </th>
                            ) : undefined
                          }
                        >
                        <th className="px-5 py-3 font-medium">Cliente</th>
                        <th className="px-5 py-3 font-medium">RIF</th>
                        <th className="px-5 py-3 font-medium">Ubicación</th>
                        <th className="px-5 py-3 font-medium">Teléfono</th>
                        <th className="px-5 py-3 font-medium">Correo</th>
                        </TableRowMetaHeaders>
                      </tr>
                    </thead>
                    <tbody>
                      {pagination.paginatedItems.map((row) => (
                        <ClickableTableRow
                          key={row.key}
                          href={clientPath(row.client.id)}
                        >
                          <TableRowMetaCells
                            showId={tableColumns.showId}
                            showCreatedAt={tableColumns.showCreatedAt}
                            id={row.client.id}
                            createdAt={row.createdAt}
                            actions={
                              showActions ? (
                                <td className="px-5 py-3.5" data-row-click="ignore">
                                  <TableRowActionsMenu
                                    viewHref={clientPath(row.client.id)}
                                    viewLabel={`Ver cliente ${row.businessName}`}
                                    onEdit={
                                      !isPendingReview(row.client)
                                        ? () => openEdit(row)
                                        : undefined
                                    }
                                    onDelete={
                                      !isPendingReview(row.client)
                                        ? () => void handleDelete(row)
                                        : undefined
                                    }
                                    onCancelReview={
                                      canCancelReview && isPendingReview(row.client)
                                        ? () => void handleCancelReview(row)
                                        : undefined
                                    }
                                    deleting={deletingId === row.client.id}
                                  />
                                </td>
                              ) : undefined
                            }
                          >
                          <td className="max-w-[220px] px-5 py-3.5 font-medium text-card-foreground">
                            <div className="space-y-1">
                              <TruncatedText maxClassName="max-w-[200px]">
                                {row.businessName}
                              </TruncatedText>
                              {isPendingReview(row.client) && (
                                <p className="text-xs font-normal text-amber-700 dark:text-amber-300">
                                  En revisión por administrador
                                </p>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-3.5 font-mono text-muted">
                            {row.rif}
                          </td>
                          <td className="max-w-[180px] px-5 py-3.5 text-muted">
                            <TruncatedText maxClassName="max-w-[160px]">
                              {`${row.city}, ${row.state}`}
                            </TruncatedText>
                          </td>
                          <td className="max-w-[140px] px-5 py-3.5 text-muted">
                            <TruncatedText maxClassName="max-w-[120px]">
                              {row.phone || "—"}
                            </TruncatedText>
                          </td>
                          <td className="max-w-[200px] px-5 py-3.5 text-muted">
                            <TruncatedText maxClassName="max-w-[180px]">
                              {row.email || "—"}
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

      <ClientCreateDialog
        open={createOpen}
        saving={saving}
        error={formError}
        companies={companies}
        onClose={() => {
          setCreateOpen(false);
          setFormError(null);
        }}
        onSubmit={(values) => void handleCreate(values)}
      />

      {selected?.branch && selectedCompany && editOpen ? (
        <ClientEditDialog
          open={editOpen}
          saving={saving}
          error={formError}
          company={selectedCompany}
          branch={selected.branch}
          onClose={() => {
            if (!saving) closeEditDialog();
          }}
          onSubmit={(values) => void handleEdit(values)}
        />
      ) : null}
    </div>
  );
}
