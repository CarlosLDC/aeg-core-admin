"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRightLeft, Loader2 } from "lucide-react";
import { DistributorSelect } from "@/components/branches/distributor-select";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { EmptyState, TableFilterEmptyState } from "@/components/ui/empty-state";
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
import type { BranchResponse } from "@/types/branch";
import type { ClientResponse, DistributorResponse } from "@/types/branch-role";
import type { CompanyResponse } from "@/types/company";
import { cn } from "@/lib/utils";

function clientCompanyLabel(client: ClientResponse): string {
  const name = client.companyBusinessName?.trim();
  const rif = client.companyRif?.trim();
  if (name && rif) return `${name} (${rif})`;
  return name || rif || `Cliente #${client.id}`;
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

  const filteredClients = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((client) => {
      const haystack = [
        clientCompanyLabel(client),
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
  }, [clients, search, distributors, branches, companies]);

  const pagination = usePagination(filteredClients, 25);
  const pageClients = pagination.paginatedItems;

  const handleTargetChange = (clientId: number, value: string) => {
    setTargetByClientId((prev) => ({ ...prev, [clientId]: value }));
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
      message: `¿Reasignar «${clientCompanyLabel(client)}» de «${fromLabel}» a «${toLabel}»? Las impresoras del cliente no cambiarán de distribuidora.`,
      confirmLabel: "Transferir",
    });
    if (!accepted) return;

    setTransferringId(client.id);
    try {
      const updated = await transferClientDistributor(client.id, targetId);
      setClients((prev) =>
        prev.map((row) => (row.id === updated.id ? updated : row)),
      );
      setTargetByClientId((prev) => {
        const next = { ...prev };
        delete next[client.id];
        return next;
      });
      toast.success("Cliente transferido correctamente.");
    } catch (err) {
      toast.error(getClientsErrorMessage(err));
    } finally {
      setTransferringId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Cargando clientes…
      </div>
    );
  }

  if (error) {
    return <EmptyState title="No se pudieron cargar los clientes" message={error} />;
  }

  return (
    <div className="space-y-4">
      <DataTableToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar por empresa, sede o distribuidor…"
      />

      {filteredClients.length === 0 ? (
        <TableFilterEmptyState />
      ) : (
        <>
          <TableScroll>
            <table className="w-full min-w-[56rem] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-muted">
                  <th className="px-3 py-2 font-medium">Empresa</th>
                  <th className="px-3 py-2 font-medium">Sede</th>
                  <th className="px-3 py-2 font-medium">Distribuidor actual</th>
                  <th className="px-3 py-2 font-medium">Nueva distribuidora</th>
                  <th className="px-3 py-2 font-medium text-right">Acción</th>
                </tr>
              </thead>
              <tbody>
                {pageClients.map((client) => {
                  const pending = client.reviewStatus === "PENDING_REVIEW";
                  const currentDistributorId = client.distributorId;
                  const busy = transferringId === client.id;

                  return (
                    <tr
                      key={client.id}
                      className={cn(
                        "border-b border-border/60",
                        pending && "opacity-60",
                      )}
                    >
                      <td className="px-3 py-3 align-middle">
                        <Link
                          href={branchPath(client.branchId)}
                          className="font-medium text-primary hover:underline"
                        >
                          <TruncatedText text={clientCompanyLabel(client)} />
                        </Link>
                        {pending ? (
                          <p className="mt-1 text-xs text-muted">
                            Solicitud de revisión pendiente
                          </p>
                        ) : null}
                      </td>
                      <td className="px-3 py-3 align-middle text-muted">
                        <TruncatedText text={clientBranchLabel(client)} />
                      </td>
                      <td className="px-3 py-3 align-middle">
                        <TruncatedText
                          text={distributorName(
                            currentDistributorId,
                            distributors,
                            branches,
                            companies,
                          )}
                        />
                      </td>
                      <td className="px-3 py-3 align-middle">
                        <DistributorSelect
                          value={targetByClientId[client.id] ?? ""}
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
                        />
                      </td>
                      <td className="px-3 py-3 align-middle text-right">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-surface-elevated disabled:cursor-not-allowed disabled:opacity-50"
                          disabled={
                            pending ||
                            busy ||
                            !(targetByClientId[client.id] ?? "").trim()
                          }
                          title={
                            pending
                              ? "Solicitud de revisión pendiente"
                              : undefined
                          }
                          onClick={() => void handleTransfer(client)}
                        >
                          {busy ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <ArrowRightLeft className="h-4 w-4" />
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
    </div>
  );
}
