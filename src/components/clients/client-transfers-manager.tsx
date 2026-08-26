"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRightLeft, Loader2 } from "lucide-react";
import { ClientTransferDialog } from "@/components/clients/client-transfer-dialog";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { EmptyState, TableFilterEmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { TablePagination } from "@/components/ui/table-pagination";
import { TableRowActionsMenu } from "@/components/ui/table-row-actions-menu";
import { TableScroll } from "@/components/ui/table-scroll";
import { TruncatedText } from "@/components/ui/truncated-text";
import { useConfirm } from "@/context/confirm-provider";
import { useToast } from "@/context/toast-provider";
import { usePagination } from "@/hooks/use-pagination";
import { distributorLabel } from "@/lib/branch-roles";
import { fetchBranches } from "@/lib/branches-api";
import {
  fetchClients,
  getClientsErrorMessage,
  transferClientDistributor,
} from "@/lib/clients-api";
import { fetchCompanies } from "@/lib/companies-api";
import { fetchDistributors } from "@/lib/distributors-api";
import { branchPath } from "@/lib/resource-routes";
import { reportListTableError } from "@/lib/api-error-message";
import {
  FILTER_ALL,
  filterAllOption,
  uniqueFilterOptions,
} from "@/lib/table-filter-options";
import type { BranchResponse } from "@/types/branch";
import type { ClientResponse, DistributorResponse } from "@/types/branch-role";
import type { CompanyResponse } from "@/types/company";

function clientBusinessName(client: ClientResponse): string {
  return (
    client.companyBusinessName?.trim() ||
    client.companyRif?.trim() ||
    `Cliente #${client.id}`
  );
}

function clientRif(client: ClientResponse): string {
  return client.companyRif?.trim() || "—";
}

function clientBranchLabel(client: ClientResponse): string {
  const city = client.branchCity?.trim();
  const state = client.branchState?.trim();
  if (city && state) return `${city}, ${state}`;
  return city || state || "—";
}

function distributorName(
  distributorId: number | undefined | null,
  distributors: DistributorResponse[],
  branches: BranchResponse[],
  companies: CompanyResponse[],
): string {
  if (!distributorId) return "Sin distribuidor";
  const distributor = distributors.find((d) => d.id === distributorId);
  if (!distributor) return "Distribuidor desconocido";
  return distributorLabel(distributor, branches, companies);
}

function PendingReviewBadge() {
  return (
    <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-800 dark:text-amber-200">
      En revisión
    </span>
  );
}

export function ClientTransfersManager() {
  const toast = useToast();
  const confirm = useConfirm();
  const [clients, setClients] = useState<ClientResponse[]>([]);
  const [distributors, setDistributors] = useState<DistributorResponse[]>([]);
  const [branches, setBranches] = useState<BranchResponse[]>([]);
  const [companies, setCompanies] = useState<CompanyResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [distributorFilter, setDistributorFilter] = useState<string>(FILTER_ALL);
  const [transferClient, setTransferClient] = useState<ClientResponse | null>(
    null,
  );
  const [saving, setSaving] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [nextClients, nextDistributors, nextBranches, nextCompanies] =
        await Promise.all([
          fetchClients(),
          fetchDistributors(),
          fetchBranches(),
          fetchCompanies(),
        ]);
      setClients(nextClients);
      setDistributors(nextDistributors);
      setBranches(nextBranches);
      setCompanies(nextCompanies);
    } catch (err) {
      const message = getClientsErrorMessage(err);
      reportListTableError({
        message,
        setListError: setError,
        toast,
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const distributorFilterOptions = useMemo(() => {
    const labels = new Map<string, string>();
    for (const client of clients) {
      if (!client.distributorId) continue;
      const value = String(client.distributorId);
      if (!labels.has(value)) {
        labels.set(
          value,
          distributorName(
            client.distributorId,
            distributors,
            branches,
            companies,
          ),
        );
      }
    }
    return [
      filterAllOption("Todas las distribuidoras"),
      ...uniqueFilterOptions(labels.keys(), (value) => labels.get(value) ?? value),
    ];
  }, [clients, distributors, branches, companies]);

  const filteredClients = useMemo(() => {
    let rows = clients;

    if (distributorFilter !== FILTER_ALL) {
      rows = rows.filter(
        (client) => String(client.distributorId ?? "") === distributorFilter,
      );
    }

    const q = search.trim().toLowerCase();
    if (!q) return rows;

    return rows.filter((client) => {
      const haystack = [
        clientBusinessName(client),
        clientRif(client),
        clientBranchLabel(client),
        distributorName(
          client.distributorId,
          distributors,
          branches,
          companies,
        ),
        String(client.id),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [clients, search, distributorFilter, distributors, branches, companies]);

  const pagination = usePagination(filteredClients, 25);
  const pageClients = pagination.paginatedItems;

  const pendingCount = useMemo(
    () => clients.filter((c) => c.reviewStatus === "PENDING_REVIEW").length,
    [clients],
  );

  function closeTransferDialog() {
    if (saving) return;
    setTransferClient(null);
    setDialogError(null);
  }

  async function handleTransferSubmit(targetId: number) {
    if (!transferClient) return;

    const fromLabel = distributorName(
      transferClient.distributorId,
      distributors,
      branches,
      companies,
    );
    const toLabel = distributorName(
      targetId,
      distributors,
      branches,
      companies,
    );

    const accepted = await confirm({
      title: "Transferir cliente",
      message: `¿Reasignar «${clientBusinessName(transferClient)}» de «${fromLabel}» a «${toLabel}»? Las impresoras del cliente no cambiarán de distribuidora.`,
      confirmLabel: "Transferir",
    });
    if (!accepted) return;

    setSaving(true);
    setDialogError(null);
    try {
      const updated = await transferClientDistributor(
        transferClient.id,
        targetId,
      );
      setClients((prev) =>
        prev.map((row) => (row.id === updated.id ? updated : row)),
      );
      setTransferClient(null);
      toast.success("Cliente transferido correctamente.");
    } catch (err) {
      setDialogError(getClientsErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="admin-content-stack">
      {error ? (
        <ErrorState
          message={error}
          onRetry={() => void load()}
          retrying={loading}
        />
      ) : null}

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-muted">
            <Loader2 className="size-5 animate-spin" />
            Cargando clientes…
          </div>
        ) : clients.length === 0 ? (
          <EmptyState
            icon={ArrowRightLeft}
            title="No hay clientes para transferir"
            description="Cuando existan clientes registrados podrás reasignarlos entre distribuidoras desde aquí."
          />
        ) : (
          <>
            <DataTableToolbar
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder="Buscar por empresa, RIF, sede o distribuidor…"
              resultCount={filteredClients.length}
              totalCount={clients.length}
              filters={[
                {
                  id: "distributor",
                  label: "Distribuidora actual",
                  value: distributorFilter,
                  onChange: setDistributorFilter,
                  options: distributorFilterOptions,
                  searchable: true,
                  searchPlaceholder: "Buscar distribuidora…",
                },
              ]}
            />

            {pendingCount > 0 ? (
              <p className="border-b border-border bg-amber-500/5 px-4 py-2.5 text-xs text-amber-900 dark:text-amber-100 sm:px-5">
                <span className="font-medium">{pendingCount}</span>{" "}
                {pendingCount === 1 ? "cliente tiene" : "clientes tienen"} una
                solicitud en revisión y no se pueden transferir hasta resolverla.
              </p>
            ) : null}

            {filteredClients.length === 0 ? (
              <TableFilterEmptyState />
            ) : (
              <>
                <TableScroll className="[&_tbody_tr]:!h-auto [&_tbody_td]:!whitespace-normal">
                  <table className="w-full min-w-[28rem] table-fixed text-left text-sm lg:min-w-0">
                    <colgroup>
                      <col className="w-[40%]" />
                      <col className="w-0 lg:w-[22%]" />
                      <col className="w-[48%] lg:w-[28%]" />
                      <col className="w-[12%] lg:w-[10%]" />
                    </colgroup>
                    <thead>
                      <tr className="border-b border-border bg-foreground/[0.02] text-muted">
                        <th className="font-medium">Cliente</th>
                        <th className="hidden font-medium lg:table-cell">
                          Sede
                        </th>
                        <th className="font-medium">
                          <span className="lg:hidden">Distribuidora</span>
                          <span className="hidden lg:inline">
                            Distribuidora actual
                          </span>
                        </th>
                        <th className="w-12 text-right font-medium sm:w-auto">
                          <span className="sr-only sm:not-sr-only">
                            Acciones
                          </span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageClients.map((client) => {
                        const pending =
                          client.reviewStatus === "PENDING_REVIEW";
                        const currentLabel = distributorName(
                          client.distributorId,
                          distributors,
                          branches,
                          companies,
                        );
                        const branchLabel = clientBranchLabel(client);

                        return (
                          <tr
                            key={client.id}
                            className="border-b border-border/60"
                          >
                            <td className="min-w-0 align-middle">
                              <div className="min-w-0 space-y-0.5 py-2.5">
                                <Link
                                  href={branchPath(client.branchId)}
                                  className="block min-w-0 font-medium text-primary hover:underline"
                                >
                                  <TruncatedText maxClassName="max-w-full">
                                    {clientBusinessName(client)}
                                  </TruncatedText>
                                </Link>
                                <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                                  <span className="font-mono text-xs text-muted">
                                    {clientRif(client)}
                                  </span>
                                  {pending ? <PendingReviewBadge /> : null}
                                </div>
                                <p className="truncate text-xs text-muted lg:hidden">
                                  {branchLabel}
                                </p>
                              </div>
                            </td>
                            <td className="hidden min-w-0 align-middle text-muted lg:table-cell">
                              <TruncatedText maxClassName="max-w-full">
                                {branchLabel}
                              </TruncatedText>
                            </td>
                            <td className="min-w-0 align-middle text-card-foreground">
                              <TruncatedText maxClassName="max-w-full">
                                {currentLabel}
                              </TruncatedText>
                            </td>
                            <td
                              className="align-middle text-right"
                              data-row-click="ignore"
                            >
                              <TableRowActionsMenu
                                viewHref={branchPath(client.branchId)}
                                viewLabel={`Ver sede de ${clientBusinessName(client)}`}
                                onEdit={
                                  pending
                                    ? undefined
                                    : () => {
                                        setDialogError(null);
                                        setTransferClient(client);
                                      }
                                }
                                editLabel="Transferir"
                              />
                            </td>
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

      <ClientTransferDialog
        open={transferClient != null}
        client={transferClient}
        distributors={distributors}
        branches={branches}
        companies={companies}
        saving={saving}
        error={dialogError}
        onClose={closeTransferDialog}
        onSubmit={(targetId) => void handleTransferSubmit(targetId)}
      />
    </div>
  );
}
