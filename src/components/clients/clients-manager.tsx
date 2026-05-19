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
import { useAuth } from "@/context/auth-provider";
import { useCompanyScope } from "@/context/company-scope-provider";
import { useToast } from "@/context/toast-provider";
import { usePagination } from "@/hooks/use-pagination";
import { fetchAuthMe } from "@/lib/auth-me-api";
import {
  mergeBranchesWithRoles,
  getBranchRolesErrorMessage,
} from "@/lib/branch-roles";
import { fetchBranches, getBranchesErrorMessage } from "@/lib/branches-api";
import { companyNameById, companySearchTextById } from "@/lib/branches";
import {
  createClientOnboarding,
  distributorClientRoles,
  type ClientOnboardingValues,
} from "@/lib/client-onboarding";
import { fetchClients } from "@/lib/clients-api";
import {
  getCompaniesErrorMessage,
} from "@/lib/companies-api";
import { fetchDistributors } from "@/lib/distributors-api";
import { fetchServiceCenters } from "@/lib/service-centers-api";
import { branchPath } from "@/lib/resource-routes";
import type { BranchWithRoles } from "@/types/branch";
import type { CompanyResponse } from "@/types/company";
import { cn } from "@/lib/utils";
import { TableScroll } from "@/components/ui/table-scroll";
import { ClickableTableRow } from "@/components/ui/clickable-table-row";
import { TruncatedText } from "@/components/ui/truncated-text";

export function ClientsManager() {
  const toast = useToast();
  const { user } = useAuth();
  const {
    scope,
    loading: scopeLoading,
    error: scopeError,
    refresh: refreshScope,
  } = useCompanyScope();
  const [distributorId, setDistributorId] = useState<number | null>(null);
  const [branches, setBranches] = useState<BranchWithRoles[]>([]);
  const [companies, setCompanies] = useState<CompanyResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (user?.role !== "DISTRIBUTOR") return;
    void fetchAuthMe()
      .then((me) => setDistributorId(me.distributorId ?? null))
      .catch(() => setDistributorId(null));
  }, [user?.role]);

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
      const merged = mergeBranchesWithRoles(
        branchRows,
        distributorRows,
        clientRows,
        serviceCenterRows,
      );
      setBranches(merged);
      setCompanies(
        [...scope.companies].sort((a, b) =>
          (a.businessName || "").localeCompare(b.businessName || "", "es"),
        ),
      );
    } catch (err) {
      setListError(getBranchesErrorMessage(err));
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

  const clientBranches = useMemo(() => {
    if (distributorId == null) return [];
    return branches.filter(
      (b) => b.client?.distributorId === distributorId,
    );
  }, [branches, distributorId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return clientBranches.filter((branch) => {
      if (!q) return true;
      const haystack = [
        branch.id,
        companySearchTextById(companies, branch.companyId),
        branch.city,
        branch.state,
        branch.phone,
        branch.email,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [clientBranches, search, companies]);

  const pagination = usePagination(filtered);

  async function handleCreate(values: ClientOnboardingValues) {
    if (distributorId == null) {
      setFormError("Tu usuario no tiene una distribuidora vinculada.");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const result = await createClientOnboarding({
        values,
        companies,
        roles: distributorClientRoles(distributorId),
      });
      toast.success(
        `Cliente "${result.companyLabel}" registrado en ${result.branchLabel}.`,
        { href: branchPath(result.branch.id) },
      );
      setCreateOpen(false);
      await refreshScope();
      await loadClients();
    } catch (err) {
      setFormError(
        getCompaniesErrorMessage(err) ||
          getBranchesErrorMessage(err) ||
          getBranchRolesErrorMessage(err),
      );
    } finally {
      setSaving(false);
    }
  }

  const canCreate = distributorId != null;

  return (
    <div className="space-y-4">
      <PageToolbar
        description="Registra clientes escaneando el documento fiscal. Empresa y ubicación se crean en un solo paso."
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
        ) : clientBranches.length === 0 ? (
          <EmptyState
            title="Sin clientes registrados"
            description="Escanea el RIF del cliente para darlo de alta con datos fiscales y ubicación."
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
              totalCount={clientBranches.length}
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
                      </tr>
                    </thead>
                    <tbody>
                      {pagination.paginatedItems.map((branch) => {
                        const company = companies.find(
                          (c) => c.id === branch.companyId,
                        );
                        return (
                          <ClickableTableRow
                            key={branch.id}
                            href={branchPath(branch.id)}
                          >
                            <td className="max-w-[220px] px-5 py-3.5 font-medium text-card-foreground">
                              <TruncatedText maxClassName="max-w-[200px]">
                                {company?.businessName ??
                                  companyNameById(companies, branch.companyId)}
                              </TruncatedText>
                            </td>
                            <td className="px-5 py-3.5 font-mono text-muted">
                              {company?.rif ?? "—"}
                            </td>
                            <td className="px-5 py-3.5 text-muted">
                              {branch.city}, {branch.state}
                            </td>
                            <td className="px-5 py-3.5 text-muted">
                              {branch.phone || "—"}
                            </td>
                            <td className="px-5 py-3.5 text-muted">
                              {branch.email || "—"}
                            </td>
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
