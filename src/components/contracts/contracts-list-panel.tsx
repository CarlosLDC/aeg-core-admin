"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ExternalLink, Loader2, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { ContractFormDialog } from "@/components/contracts/contract-form-dialog";
import { ContractStatusBadge } from "@/components/contracts/contract-status-badge";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { TablePagination } from "@/components/ui/table-pagination";
import { useToast } from "@/context/toast-provider";
import { usePagination } from "@/hooks/use-pagination";
import {
  contractStatus,
  formatContractDate,
  toDistributorContractBody,
  toServiceCenterContractBody,
  type ContractFormValues,
} from "@/lib/contract-form";
import {
  createDistributorContract,
  deleteDistributorContract,
  fetchDistributorContracts,
  getDistributorContractsErrorMessage,
  updateDistributorContract,
} from "@/lib/distributor-contracts-api";
import {
  createServiceCenterContract,
  deleteServiceCenterContract,
  fetchServiceCenterContracts,
  getServiceCenterContractsErrorMessage,
  updateServiceCenterContract,
} from "@/lib/service-center-contracts-api";
import type { ContractKind } from "@/types/contract";
import type {
  DistributorContractResponse,
  ServiceCenterContractResponse,
} from "@/types/contract";
import { cn } from "@/lib/utils";

type PartyOption = { id: number; label: string };

type ContractsListPanelProps = {
  kind: ContractKind;
  partyOptions: PartyOption[];
  catalogLoading: boolean;
  getPartyLabel: (
    contract: DistributorContractResponse | ServiceCenterContractResponse,
  ) => string;
};

function partyIdFromContract(
  kind: ContractKind,
  contract: DistributorContractResponse | ServiceCenterContractResponse,
): number {
  return kind === "distributor"
    ? (contract as DistributorContractResponse).distributorId
    : (contract as ServiceCenterContractResponse).serviceCenterId;
}

export function ContractsListPanel({
  kind,
  partyOptions,
  catalogLoading,
  getPartyLabel,
}: ContractsListPanelProps) {
  const toast = useToast();
  const [contracts, setContracts] = useState<
    (DistributorContractResponse | ServiceCenterContractResponse)[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<"create" | "edit" | null>(null);
  const [selected, setSelected] = useState<
    DistributorContractResponse | ServiceCenterContractResponse | null
  >(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const getErrorMessage =
    kind === "distributor"
      ? getDistributorContractsErrorMessage
      : getServiceCenterContractsErrorMessage;

  const filteredContracts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return contracts.filter((contract) => {
      const status = contractStatus(contract.startDate, contract.endDate);
      if (statusFilter !== "all" && status !== statusFilter) return false;
      if (!q) return true;
      const haystack = [
        contract.id,
        partyIdFromContract(kind, contract),
        getPartyLabel(contract),
        contract.startDate,
        contract.endDate,
        ...(contract.photoUrls ?? []),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [contracts, search, statusFilter, kind, getPartyLabel]);

  const pagination = usePagination(filteredContracts);

  const loadContracts = useCallback(async () => {
    setLoading(true);
    setListError(null);
    try {
      const data =
        kind === "distributor"
          ? await fetchDistributorContracts()
          : await fetchServiceCenterContracts();
      setContracts(
        data.sort((a, b) => b.startDate.localeCompare(a.startDate, "es")),
      );
    } catch (err) {
      const message = getErrorMessage(err);
      setListError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [kind, toast, getErrorMessage]);

  useEffect(() => {
    loadContracts();
  }, [loadContracts]);

  function openCreate() {
    setSelected(null);
    setFormError(null);
    setDialog("create");
  }

  function openEdit(
    contract: DistributorContractResponse | ServiceCenterContractResponse,
  ) {
    setSelected(contract);
    setFormError(null);
    setDialog("edit");
  }

  function closeDialog() {
    setDialog(null);
    setSelected(null);
    setFormError(null);
  }

  async function handleSubmit(values: ContractFormValues) {
    setFormError(null);

    setSaving(true);

    try {
      if (kind === "distributor") {
        const body = toDistributorContractBody(values);
        if (typeof body === "string") {
          setFormError(body);
          return;
        }
        if (dialog === "create") {
          await createDistributorContract(body);
          toast.success("Contrato creado correctamente.");
        } else if (selected) {
          await updateDistributorContract(selected.id, body);
          toast.success("Contrato actualizado.");
        }
      } else {
        const body = toServiceCenterContractBody(values);
        if (typeof body === "string") {
          setFormError(body);
          return;
        }
        if (dialog === "create") {
          await createServiceCenterContract(body);
          toast.success("Contrato creado correctamente.");
        } else if (selected) {
          await updateServiceCenterContract(selected.id, body);
          toast.success("Contrato actualizado.");
        }
      }
      closeDialog();
      await loadContracts();
    } catch (err) {
      const message = getErrorMessage(err);
      setFormError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(
    contract: DistributorContractResponse | ServiceCenterContractResponse,
  ) {
    const label = getPartyLabel(contract);
    if (
      !window.confirm(
        `¿Eliminar el contrato #${contract.id} (${label})? Esta acción no se puede deshacer.`,
      )
    ) {
      return;
    }
    setDeletingId(contract.id);
    try {
      if (kind === "distributor") {
        await deleteDistributorContract(contract.id);
      } else {
        await deleteServiceCenterContract(contract.id);
      }
      await loadContracts();
      toast.success("Contrato eliminado.");
    } catch (err) {
      const message = getErrorMessage(err);
      setListError(message);
      toast.error(message);
    } finally {
      setDeletingId(null);
    }
  }

  const partyColumn =
    kind === "distributor" ? "Distribuidora" : "Centro de servicio";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={loadContracts}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-foreground/5 disabled:opacity-50"
        >
          <RefreshCw className={cn("size-4", loading && "animate-spin")} />
          Actualizar
        </button>
        <button
          type="button"
          onClick={openCreate}
          disabled={catalogLoading || partyOptions.length === 0}
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-foreground disabled:opacity-50"
        >
          <Plus className="size-4" />
          Nuevo contrato
        </button>
      </div>

      {partyOptions.length === 0 && !catalogLoading && (
        <p className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
          Registra al menos un{" "}
          {kind === "distributor"
            ? "distribuidor en una sucursal"
            : "centro de servicio en una sucursal"}{" "}
          antes de crear contratos.
        </p>
      )}

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
            Cargando contratos…
          </div>
        ) : contracts.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted">
            No hay contratos registrados.
          </p>
        ) : (
          <>
            <DataTableToolbar
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder="Buscar por ID, parte o fechas…"
              resultCount={filteredContracts.length}
              totalCount={contracts.length}
              filters={[
                {
                  id: "status",
                  label: "Estado",
                  value: statusFilter,
                  onChange: setStatusFilter,
                  options: [
                    { value: "all", label: "Todos" },
                    { value: "active", label: "Vigentes" },
                    { value: "upcoming", label: "Próximos" },
                    { value: "expired", label: "Vencidos" },
                  ],
                },
              ]}
            />
            {filteredContracts.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted">
                No hay resultados con los filtros aplicados.
              </p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[920px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-border bg-foreground/[0.02] text-muted">
                        <th className="px-5 py-3 font-medium">ID</th>
                        <th className="px-5 py-3 font-medium">{partyColumn}</th>
                        <th className="px-5 py-3 font-medium">Vigencia</th>
                        <th className="px-5 py-3 font-medium">Estado</th>
                        <th className="px-5 py-3 font-medium">Fotos</th>
                        <th className="px-5 py-3 font-medium text-right">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagination.paginatedItems.map((contract) => (
                        <tr
                          key={contract.id}
                          className="border-b border-border last:border-0 hover:bg-foreground/[0.02]"
                        >
                          <td className="px-5 py-3.5 text-muted">
                            {contract.id}
                          </td>
                          <td className="max-w-[220px] truncate px-5 py-3.5 font-medium text-card-foreground">
                            {getPartyLabel(contract)}
                          </td>
                          <td className="px-5 py-3.5 text-card-foreground">
                            {formatContractDate(contract.startDate)} –{" "}
                            {formatContractDate(contract.endDate)}
                          </td>
                          <td className="px-5 py-3.5">
                            <ContractStatusBadge
                              startDate={contract.startDate}
                              endDate={contract.endDate}
                            />
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="text-muted">
                              {contract.photoUrls?.length ?? 0}
                            </span>
                            {(contract.photoUrls?.length ?? 0) > 0 && (
                              <a
                                href={contract.photoUrls[0]}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="ml-2 inline-flex items-center gap-0.5 text-xs text-accent hover:underline"
                              >
                                Ver
                                <ExternalLink className="size-3" />
                              </a>
                            )}
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => openEdit(contract)}
                                className="rounded-lg p-2 text-muted transition-colors hover:bg-foreground/5 hover:text-foreground"
                                aria-label="Editar contrato"
                              >
                                <Pencil className="size-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(contract)}
                                disabled={deletingId === contract.id}
                                className="rounded-lg p-2 text-muted transition-colors hover:bg-rose-500/10 hover:text-rose-600 disabled:opacity-50"
                                aria-label="Eliminar contrato"
                              >
                                {deletingId === contract.id ? (
                                  <Loader2 className="size-4 animate-spin" />
                                ) : (
                                  <Trash2 className="size-4" />
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <TablePagination pagination={pagination} />
              </>
            )}
          </>
        )}
      </div>

      <ContractFormDialog
        kind={kind}
        mode={dialog === "create" ? "create" : "edit"}
        contract={selected ?? undefined}
        partyOptions={partyOptions}
        catalogLoading={catalogLoading}
        open={dialog !== null}
        saving={saving}
        error={formError}
        onClose={closeDialog}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
