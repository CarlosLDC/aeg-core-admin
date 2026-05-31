"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ExternalLink, Loader2, Plus } from "lucide-react";
import { ContractFormDialog } from "@/components/contracts/contract-form-dialog";
import { ContractStatusBadge } from "@/components/contracts/contract-status-badge";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
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
import { filterAllOption } from "@/lib/table-filter-options";
import { useAuth } from "@/context/auth-provider";
import { useToast } from "@/context/toast-provider";
import { useConfirm } from "@/context/confirm-provider";
import {
  canCreateContractRecord,
  canDeleteContractRecord,
  canManageContracts,
} from "@/lib/api-permissions";
import { forbiddenMessage } from "@/lib/permissions/messages";
import {
  distributorContractPath,
  serviceCenterContractPath,
} from "@/lib/resource-routes";
import {
  ClickableTableRow,
  stopTableRowClick,
} from "@/components/ui/clickable-table-row";
import { TableRowActionsMenu } from "@/components/ui/table-row-actions-menu";
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
import {
  contractDocumentLabel,
  contractDocumentViewUrl,
  isPdfUrl,
} from "@/lib/contract-documents";
import { cn } from "@/lib/utils";
import { TableScroll } from "@/components/ui/table-scroll";
import { TruncatedText } from "@/components/ui/truncated-text";
import { SortableTableHeader } from "@/components/ui/sortable-table-header";

type PartyOption = { id: number; label: string };

type ContractsListPanelProps = {
  kind: ContractKind;
  partyOptions: PartyOption[];
  catalogLoading: boolean;
  getPartyLabel: (
    contract: DistributorContractResponse | ServiceCenterContractResponse,
  ) => string;
};

type ContractSortKey = "validity" | "id" | "createdAt";

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
  const confirm = useConfirm();
  const { user } = useAuth();
  const canCreate = user ? canCreateContractRecord(user.role) : false;
  const canModify = user ? canManageContracts(user.role) : false;
  const canDelete = user ? canDeleteContractRecord(user.role) : false;
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
  const tableColumns = useTableColumnVisibility(`contracts-${kind}`);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sort, setSort] = useState<TableSortState<ContractSortKey>>(null);

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

  const sortedContracts = useMemo(
    () =>
      sortTableRows(filteredContracts, sort, {
        validity: (a, b) => {
          const byStart = compareDateValues(a.startDate, b.startDate);
          if (byStart !== 0) return byStart;
          return compareDateValues(a.endDate, b.endDate);
        },
        id: (a, b) => compareNumberValues(a.id, b.id),
        createdAt: (a, b) => compareDateValues(a.createdAt, b.createdAt),
      }),
    [filteredContracts, sort],
  );

  const pagination = usePagination(sortedContracts);

  const loadContracts = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;
    if (!silent) {
      setLoading(true);
      setListError(null);
    }
    try {
      const data =
        kind === "distributor"
          ? await fetchDistributorContracts()
          : await fetchServiceCenterContracts();
      setContracts(
        data.sort((a, b) => b.startDate.localeCompare(a.startDate, "es")),
      );
    } catch (err) {
      reportListTableError({
        message: getErrorMessage(err),
        setListError,
        toast,
      });
    } finally {
      if (!silent) setLoading(false);
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
    if (dialog === "create" && !canCreate) {
      setFormError(forbiddenMessage("create", "contracts"));
      return;
    }
    if (dialog === "edit" && !canModify) {
      setFormError(forbiddenMessage("update", "contracts"));
      return;
    }

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
          const created = await createDistributorContract(body);
          toast.success("Contrato creado correctamente.", {
            href: distributorContractPath(created.id),
          });
        } else if (selected) {
          await updateDistributorContract(selected.id, body);
          toast.success("Contrato actualizado.", {
            href: distributorContractPath(selected.id),
          });
        }
      } else {
        const body = toServiceCenterContractBody(values);
        if (typeof body === "string") {
          setFormError(body);
          return;
        }
        if (dialog === "create") {
          const created = await createServiceCenterContract(body);
          toast.success("Contrato creado correctamente.", {
            href: serviceCenterContractPath(created.id),
          });
        } else if (selected) {
          await updateServiceCenterContract(selected.id, body);
          toast.success("Contrato actualizado.", {
            href: serviceCenterContractPath(selected.id),
          });
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
    fromDialog = false,
  ) {
    if (!canDelete) {
      toast.error(forbiddenMessage("delete", "contracts"));
      return;
    }
    const label = getPartyLabel(contract);
    if (!(await confirm({ title: "Confirmar", message: `¿Eliminar el contrato ${contract.id} (${label})? Esta acción no se puede deshacer.`, destructive: true }))) {
      return;
    }
    setDeletingId(contract.id);
    try {
      if (kind === "distributor") {
        await deleteDistributorContract(contract.id);
      } else {
        await deleteServiceCenterContract(contract.id);
      }
      if (fromDialog) closeDialog();
      await loadContracts({ silent: true });
      toast.success("Contrato eliminado.");
    } catch (err) {
      reportListTableError({
        message: getErrorMessage(err),
        recordLabel: `Contrato ${contract.id} (${getPartyLabel(contract)})`,
        setListError,
        toast,
      });
    } finally {
      setDeletingId(null);
    }
  }

  const partyColumn =
    kind === "distributor" ? "Distribuidora" : "Centro de servicio";

  return (
    <div className="space-y-4">
      <PageToolbar
        actions={
          canCreate ? (
            <button
              type="button"
              onClick={openCreate}
              disabled={catalogLoading || partyOptions.length === 0}
              className={cn(
                pageToolbarButtonClass,
                "bg-accent text-accent-foreground disabled:opacity-50",
              )}
            >
              <Plus className="size-4" />
              Nuevo contrato
            </button>
          ) : undefined
        }
      />

      {partyOptions.length === 0 && !catalogLoading && (
        <p
          role="status"
          className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200"
        >
          Registra al menos un{" "}
          {kind === "distributor"
            ? "distribuidor en una empresa"
            : "centro de servicio en una empresa"}{" "}
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
          <EmptyState title="No hay contratos registrados." />
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
                    filterAllOption(),
                    { value: "active", label: "Vigentes" },
                    { value: "upcoming", label: "Próximos" },
                    { value: "expired", label: "Vencidos" },
                  ],
                },
              ]}
              columns={tableColumns.toolbarColumns}
            />
            {filteredContracts.length === 0 ? (
              <TableFilterEmptyState />
            ) : (
              <>
                <TableScroll>
                  <table className="w-full min-w-[920px] text-left text-sm">
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
                            <th className="px-5 py-3 font-medium text-right">
                              Acciones
                            </th>
                          }
                        >
                        <th className="px-5 py-3 font-medium">{partyColumn}</th>
                        <SortableTableHeader
                          label="Vigencia"
                          sortDirection={sort?.key === "validity" ? sort.direction : null}
                          onToggle={() =>
                            setSort((current) =>
                              toggleTableSort(current, "validity"),
                            )
                          }
                        />
                        <th className="px-5 py-3 font-medium">Estado</th>
                        <th className="px-5 py-3 font-medium">Documentos</th>
                        </TableRowMetaHeaders>
                      </tr>
                    </thead>
                    <tbody>
                      {pagination.paginatedItems.map((contract) => {
                        const contractHref =
                          kind === "distributor"
                            ? distributorContractPath(contract.id)
                            : serviceCenterContractPath(contract.id);
                        return (
                        <ClickableTableRow
                          key={contract.id}
                          href={contractHref}
                        >
                          <TableRowMetaCells
                            showId={tableColumns.showId}
                            showCreatedAt={tableColumns.showCreatedAt}
                            id={contract.id}
                            createdAt={contract.createdAt}
                            actions={
                              <td className="px-5 py-3.5" data-row-click="ignore">
                                <TableRowActionsMenu
                                  viewHref={contractHref}
                                  viewLabel={`Ver contrato ${contract.id}`}
                                  onEdit={
                                    canModify ? () => openEdit(contract) : undefined
                                  }
                                  onDelete={
                                    canDelete
                                      ? () => handleDelete(contract)
                                      : undefined
                                  }
                                  deleting={deletingId === contract.id}
                                />
                              </td>
                            }
                          >
                          <td className="max-w-[220px] px-5 py-3.5 font-medium text-card-foreground">
                            <TruncatedText maxClassName="max-w-[200px]">
                              {getPartyLabel(contract)}
                            </TruncatedText>
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
                            {(contract.photoUrls?.length ?? 0) === 0 ? (
                              <span className="text-muted">—</span>
                            ) : (
                              <ul className="space-y-1">
                                {contract.photoUrls.map((url) => (
                                  <li key={url}>
                                    <a
                                      href={contractDocumentViewUrl(url)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={stopTableRowClick}
                                      className="inline-flex max-w-[200px] min-w-0 items-center gap-1 text-xs text-accent hover:underline"
                                    >
                                      <TruncatedText
                                        maxClassName="max-w-[160px]"
                                        className="text-accent"
                                      >
                                        {`${isPdfUrl(url) ? "PDF" : "Imagen"}: ${contractDocumentLabel(url)}`}
                                      </TruncatedText>
                                      <ExternalLink className="size-3 shrink-0" />
                                    </a>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </td>
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
