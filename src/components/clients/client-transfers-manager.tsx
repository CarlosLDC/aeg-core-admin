"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, ArrowRightLeft, Info, Loader2 } from "lucide-react";
import { DistributorSelect } from "@/components/branches/distributor-select";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { EmptyState, TableFilterEmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { TablePagination } from "@/components/ui/table-pagination";
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
import { cn } from "@/lib/utils";

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

function TransferGuide() {
  const steps = [
    "Busca el cliente en la tabla.",
    "Elige la nueva distribuidora de destino.",
    "Confirma la transferencia.",
  ];

  return (
    <div className="rounded-xl border border-accent/20 bg-accent/5 p-4 sm:p-5">
      <div className="flex gap-3">
        <div
          className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent"
          aria-hidden
        >
          <Info className="size-4" />
        </div>
        <div className="min-w-0 space-y-3">
          <div>
            <h2 className="text-sm font-semibold text-card-foreground">
              Cómo transferir un cliente
            </h2>
            <p className="mt-1 text-sm text-muted">
              Solo cambia la relación cliente–distribuidor. Las impresoras del
              cliente conservan su distribuidora actual.
            </p>
          </div>
          <ol className="grid gap-2 sm:grid-cols-3">
            {steps.map((step, index) => (
              <li
                key={step}
                className="flex items-start gap-2 rounded-lg border border-border/60 bg-card/80 px-3 py-2 text-sm text-card-foreground"
              >
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-accent/15 text-[11px] font-semibold text-accent">
                  {index + 1}
                </span>
                <span className="min-w-0 leading-snug">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
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
  const [targetByClientId, setTargetByClientId] = useState<
    Record<number, string>
  >({});
  const [transferringId, setTransferringId] = useState<number | null>(null);

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

  const handleTargetChange = (clientId: number, value: string) => {
    setTargetByClientId((prev) => ({ ...prev, [clientId]: value }));
  };

  const clearTarget = (clientId: number) => {
    setTargetByClientId((prev) => {
      const next = { ...prev };
      delete next[clientId];
      return next;
    });
  };

  const handleTransfer = async (client: ClientResponse) => {
    const targetValue = targetByClientId[client.id]?.trim();
    if (!targetValue) {
      toast.error("Selecciona la distribuidora de destino.");
      return;
    }
    const targetId = Number(targetValue);
    if (!Number.isFinite(targetId)) {
      toast.error("Distribuidora de destino no válida.");
      return;
    }

    const fromLabel = distributorName(
      client.distributorId,
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
      message: `¿Reasignar «${clientBusinessName(client)}» de «${fromLabel}» a «${toLabel}»? Las impresoras del cliente no cambiarán de distribuidora.`,
      confirmLabel: "Transferir",
    });
    if (!accepted) return;

    setTransferringId(client.id);
    try {
      const updated = await transferClientDistributor(client.id, targetId);
      setClients((prev) =>
        prev.map((row) => (row.id === updated.id ? updated : row)),
      );
      clearTarget(client.id);
      toast.success("Cliente transferido correctamente.");
    } catch (err) {
      toast.error(getClientsErrorMessage(err));
    } finally {
      setTransferringId(null);
    }
  };

  return (
    <div className="space-y-4">
      <TransferGuide />

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
                <TableScroll>
                  <table className="w-full min-w-[52rem] text-left text-sm">
                    <thead>
                      <tr className="border-b border-border bg-foreground/[0.02] text-muted">
                        <th className="px-5 py-3 font-medium">Cliente</th>
                        <th className="px-5 py-3 font-medium">Sede</th>
                        <th className="px-5 py-3 font-medium">Reasignación</th>
                        <th className="px-5 py-3 text-right font-medium">
                          Acción
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageClients.map((client) => {
                        const pending =
                          client.reviewStatus === "PENDING_REVIEW";
                        const currentDistributorId = client.distributorId;
                        const busy = transferringId === client.id;
                        const targetValue = targetByClientId[client.id] ?? "";
                        const hasTarget = Boolean(targetValue.trim());
                        const currentLabel = distributorName(
                          currentDistributorId,
                          distributors,
                          branches,
                          companies,
                        );

                        return (
                          <tr
                            key={client.id}
                            className={cn(
                              "border-b border-border/60 transition-colors",
                              hasTarget &&
                                !pending &&
                                "bg-accent/[0.03]",
                            )}
                          >
                            <td className="px-5 py-3.5 align-middle">
                              <div className="space-y-1">
                                <Link
                                  href={branchPath(client.branchId)}
                                  className="font-medium text-primary hover:underline"
                                >
                                  <TruncatedText maxClassName="max-w-[220px]">
                                    {clientBusinessName(client)}
                                  </TruncatedText>
                                </Link>
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-mono text-xs text-muted">
                                    {clientRif(client)}
                                  </span>
                                  {pending ? <PendingReviewBadge /> : null}
                                </div>
                              </div>
                            </td>
                            <td className="max-w-[200px] px-5 py-3.5 align-middle text-muted">
                              <TruncatedText maxClassName="max-w-[180px]">
                                {clientBranchLabel(client)}
                              </TruncatedText>
                            </td>
                            <td className="px-5 py-3.5 align-middle">
                              <div className="flex min-w-[18rem] flex-col gap-2 lg:min-w-[24rem]">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span
                                    className={cn(
                                      "inline-flex max-w-full items-center rounded-lg border px-2.5 py-1.5 text-xs font-medium",
                                      pending
                                        ? "border-border bg-foreground/[0.03] text-muted"
                                        : "border-border bg-background text-card-foreground",
                                    )}
                                    title="Distribuidora actual"
                                  >
                                    <TruncatedText maxClassName="max-w-[160px]">
                                      {currentLabel}
                                    </TruncatedText>
                                  </span>
                                  <ArrowRight
                                    className="size-4 shrink-0 text-muted"
                                    aria-hidden
                                  />
                                  <div className="min-w-[12rem] flex-1">
                                    <DistributorSelect
                                      value={targetValue}
                                      onChange={(value) =>
                                        handleTargetChange(client.id, value)
                                      }
                                      distributors={distributors.filter(
                                        (d) => d.id !== currentDistributorId,
                                      )}
                                      branches={branches}
                                      companies={companies}
                                      disabled={pending || busy}
                                      excludeBranchId={client.branchId}
                                      emptyLabel="Nueva distribuidora"
                                      searchPlaceholder="Buscar distribuidora…"
                                      modalTitle="Nueva distribuidora"
                                    />
                                  </div>
                                </div>
                                {hasTarget && !pending ? (
                                  <button
                                    type="button"
                                    onClick={() => clearTarget(client.id)}
                                    className="self-start text-xs font-medium text-muted transition-colors hover:text-foreground"
                                  >
                                    Quitar selección
                                  </button>
                                ) : null}
                              </div>
                            </td>
                            <td className="px-5 py-3.5 align-middle text-right">
                              <button
                                type="button"
                                className={cn(
                                  "inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                                  hasTarget && !pending
                                    ? "bg-accent text-accent-foreground hover:opacity-90"
                                    : "border border-border text-card-foreground hover:bg-foreground/5",
                                )}
                                disabled={pending || busy || !hasTarget}
                                title={
                                  pending
                                    ? "Solicitud de revisión pendiente"
                                    : !hasTarget
                                      ? "Selecciona una distribuidora de destino"
                                      : undefined
                                }
                                onClick={() => void handleTransfer(client)}
                              >
                                {busy ? (
                                  <Loader2 className="size-4 animate-spin" />
                                ) : (
                                  <ArrowRightLeft className="size-4" />
                                )}
                                Transferir
                              </button>
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
    </div>
  );
}
