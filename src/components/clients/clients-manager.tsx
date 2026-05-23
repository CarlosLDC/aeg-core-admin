"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Plus, RefreshCw } from "lucide-react";
import { ClientCreateDialog } from "@/components/clients/client-create-dialog";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import {
  PageToolbar,
  pageToolbarButtonClass,
} from "@/components/ui/page-toolbar";
import { TablePagination } from "@/components/ui/table-pagination";
import { useCompanyScope } from "@/context/company-scope-provider";
import { useToast } from "@/context/toast-provider";
import { usePagination } from "@/hooks/use-pagination";
import { useDistributorId } from "@/hooks/use-distributor-id";
import {
  TableCreatedAtCell,
  TableCreatedAtHeader,
} from "@/components/ui/table-created-at";
import {
  filterAllOption,
  uniqueFilterOptions,
} from "@/lib/table-filter-options";
import { mergeBranchesWithRoles } from "@/lib/branch-roles";
import { fetchBranchById, fetchBranches } from "@/lib/branches-api";
import { companyNameById } from "@/lib/branches";
import {
  createClientOnboarding,
  distributorClientRoles,
  type ClientOnboardingValues,
} from "@/lib/client-onboarding";
import { fetchClientByBranchId, fetchClients } from "@/lib/clients-api";
import { getCatalogErrorMessage } from "@/lib/api-error-message";
import { fetchDistributors } from "@/lib/distributors-api";
import { fetchServiceCenters } from "@/lib/service-centers-api";
import { branchPath, clientPath } from "@/lib/resource-routes";
import type { BranchWithRoles } from "@/types/branch";
import type { ClientResponse } from "@/types/branch-role";
import type { CompanyResponse } from "@/types/company";
import { cn } from "@/lib/utils";
import { TableScroll } from "@/components/ui/table-scroll";
import { ClickableTableRow } from "@/components/ui/clickable-table-row";
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

function buildClientListRows(
  clients: ClientResponse[],
  distributorId: number,
  branches: BranchWithRoles[],
  companies: CompanyResponse[],
): ClientListRow[] {
  const branchById = new Map(branches.map((b) => [b.id, b]));
  return clients
    .filter((client) => client.distributorId === distributorId)
    .map((client) => {
      const branch = branchById.get(client.branchId);
      const companyFromScope =
        branch != null
          ? companies.find((c) => c.id === branch.companyId)
          : undefined;
      return {
        key: client.id,
        client,
        branch,
        businessName:
          client.companyBusinessName?.trim() ||
          companyFromScope?.businessName ||
          (branch != null
            ? companyNameById(companies, branch.companyId)
            : "—"),
        rif:
          client.companyRif?.trim() ||
          companyFromScope?.rif ||
          "—",
        city: client.branchCity?.trim() || branch?.city || "—",
        state: client.branchState?.trim() || branch?.state || "—",
        phone: client.branchPhone?.trim() || branch?.phone || "—",
        email: client.branchEmail?.trim() || branch?.email || "—",
        createdAt: branch?.createdAt ?? client.createdAt,
      };
    })
    .sort((a, b) => a.businessName.localeCompare(b.businessName, "es"));
}

export function ClientsManager() {
  const toast = useToast();
  const {
    scope,
    loading: scopeLoading,
    error: scopeError,
    refresh: refreshScope,
  } = useCompanyScope();
  const distributorId = useDistributorId();
  const [clients, setClients] = useState<ClientResponse[]>([]);
  const [branches, setBranches] = useState<BranchWithRoles[]>([]);
  const [companies, setCompanies] = useState<CompanyResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [resumeBranchId, setResumeBranchId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState("all");

  const loadClients = useCallback(async () => {
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
      setBranches(merged);
      setCompanies(
        [...scope.companies].sort((a, b) =>
          (a.businessName || "").localeCompare(b.businessName || "", "es"),
        ),
      );
    } catch (err) {
      setListError(getCatalogErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [scope]);

  useEffect(() => {
    if (scopeLoading || !scope) return;
    void loadClients();
  }, [scopeLoading, scope, loadClients]);

  useEffect(() => {
    if (scopeError) setListError((prev) => prev ?? scopeError);
  }, [scopeError]);

  const clientListRows = useMemo(() => {
    if (distributorId == null) return [];
    return buildClientListRows(clients, distributorId, branches, companies);
  }, [clients, branches, companies, distributorId]);

  const stateFilterOptions = useMemo(
    () => [
      filterAllOption("Todos los estados"),
      ...uniqueFilterOptions(clientListRows.map((r) => r.state)),
    ],
    [clientListRows],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return clientListRows.filter((row) => {
      if (stateFilter !== "all" && row.state !== stateFilter) return false;
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

  const pagination = usePagination(filtered);

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
    try {
      const result = await createClientOnboarding({
        values,
        companies,
        resumeBranchId: branchIdForRetry ?? undefined,
        roles: distributorClientRoles(distributorId),
      });
      const linkedParts = [
        result.companyLinkedExisting ? "empresa existente" : null,
        result.branchLinkedExisting ? "sucursal existente" : null,
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

  return (
    <div className="space-y-4">
      <PageToolbar
        actions={
          <>
            <button
              type="button"
              onClick={() => void loadClients()}
              disabled={loading || scopeLoading}
              className={cn(
                pageToolbarButtonClass,
                "border border-border bg-card text-foreground hover:bg-foreground/5 disabled:opacity-50",
              )}
            >
              <RefreshCw
                className={cn("size-4", (loading || scopeLoading) && "animate-spin")}
              />
              Actualizar
            </button>
            {canCreate && (
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
            )}
          </>
        }
      />

      {distributorId == null && !loading && !scopeLoading && (
        <p
          role="alert"
          className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200"
        >
          Tu usuario no tiene una distribuidora vinculada. Contacta a un
          administrador para que te asigne una en tu cuenta.
        </p>
      )}

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
                },
              ]}
            />
            {filtered.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted">
                No hay resultados con los filtros aplicados.
              </p>
            ) : (
              <>
                <TableScroll>
                  <table className="w-full min-w-[720px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-border bg-foreground/[0.02] text-muted">
                        <th className="px-5 py-3 font-medium">Cliente</th>
                        <th className="px-5 py-3 font-medium">RIF</th>
                        <th className="px-5 py-3 font-medium">Ubicación</th>
                        <th className="px-5 py-3 font-medium">Teléfono</th>
                        <th className="px-5 py-3 font-medium">Correo</th>
                        <TableCreatedAtHeader />
                      </tr>
                    </thead>
                    <tbody>
                      {pagination.paginatedItems.map((row) => (
                        <ClickableTableRow
                          key={row.key}
                          href={clientPath(row.client.id)}
                        >
                          <td className="max-w-[220px] px-5 py-3.5 font-medium text-card-foreground">
                            <TruncatedText maxClassName="max-w-[200px]">
                              {row.businessName}
                            </TruncatedText>
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
                          <TableCreatedAtCell value={row.createdAt} />
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
    </div>
  );
}
