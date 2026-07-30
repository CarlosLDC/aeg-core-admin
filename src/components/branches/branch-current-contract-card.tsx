"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FileText, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { ContractFormDialog } from "@/components/contracts/contract-form-dialog";
import { ContractStatusBadge } from "@/components/contracts/contract-status-badge";
import {
  DetailField,
  DetailSection,
} from "@/components/resource-view/detail-fields";
import { useConfirm } from "@/context/confirm-provider";
import { useToast } from "@/context/toast-provider";
import { forbiddenMessage } from "@/lib/permissions/messages";
import {
  formatContractDate,
  pickCurrentContract,
  toDistributorContractBody,
  toServiceCenterContractBody,
  type ContractFormValues,
} from "@/lib/contract-form";
import {
  contractDocumentLabel,
  contractDocumentViewUrl,
  isPdfUrl,
} from "@/lib/contract-documents";
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
import { formatDate } from "@/lib/datetime-form";
import { branchPath } from "@/lib/resource-routes";
import type { ContractKind } from "@/types/contract";
import type {
  DistributorContractResponse,
  ServiceCenterContractResponse,
} from "@/types/contract";

type BranchCurrentContractCardProps = {
  kind: ContractKind;
  partyId: number;
  partyLabel: string;
  branchId: number;
  canCreate: boolean;
  canModify: boolean;
  canDelete: boolean;
  onChanged?: () => void;
};

export function BranchCurrentContractCard({
  kind,
  partyId,
  partyLabel,
  branchId,
  canCreate,
  canModify,
  canDelete,
  onChanged,
}: BranchCurrentContractCardProps) {
  const toast = useToast();
  const confirm = useConfirm();
  const isDistributor = kind === "distributor";
  const title = isDistributor
    ? "Contrato de distribuidora"
    : "Contrato de centro de servicio";

  const [contracts, setContracts] = useState<
    (DistributorContractResponse | ServiceCenterContractResponse)[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<"create" | "edit" | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const getErrorMessage = isDistributor
    ? getDistributorContractsErrorMessage
    : getServiceCenterContractsErrorMessage;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = isDistributor
        ? await fetchDistributorContracts()
        : await fetchServiceCenterContracts();
      const forParty = rows.filter((row) =>
        isDistributor
          ? (row as DistributorContractResponse).distributorId === partyId
          : (row as ServiceCenterContractResponse).serviceCenterId === partyId,
      );
      setContracts(forParty);
    } catch (err) {
      setError(getErrorMessage(err));
      setContracts([]);
    } finally {
      setLoading(false);
    }
  }, [getErrorMessage, isDistributor, partyId]);

  useEffect(() => {
    void load();
  }, [load]);

  const current = useMemo(
    () => pickCurrentContract(contracts),
    [contracts],
  );

  const partyOptions = useMemo(
    () => [{ id: partyId, label: partyLabel }],
    [partyId, partyLabel],
  );

  async function handleSubmit(values: ContractFormValues) {
    if (dialog === "create" && !canCreate) {
      setFormError(forbiddenMessage("create", "contracts"));
      return;
    }
    if (dialog === "edit" && !canModify) {
      setFormError(forbiddenMessage("update", "contracts"));
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      if (isDistributor) {
        const body = toDistributorContractBody({
          ...values,
          partyId: String(partyId),
        });
        if (typeof body === "string") {
          setFormError(body);
          return;
        }
        if (dialog === "create") {
          await createDistributorContract(body);
          toast.success("Contrato creado.", { href: branchPath(branchId) });
        } else if (current) {
          await updateDistributorContract(current.id, body);
          toast.success("Contrato actualizado.", { href: branchPath(branchId) });
        }
      } else {
        const body = toServiceCenterContractBody({
          ...values,
          partyId: String(partyId),
        });
        if (typeof body === "string") {
          setFormError(body);
          return;
        }
        if (dialog === "create") {
          await createServiceCenterContract(body);
          toast.success("Contrato creado.", { href: branchPath(branchId) });
        } else if (current) {
          await updateServiceCenterContract(current.id, body);
          toast.success("Contrato actualizado.", { href: branchPath(branchId) });
        }
      }
      setDialog(null);
      await load();
      onChanged?.();
    } catch (err) {
      const message = getErrorMessage(err);
      setFormError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!current || !canDelete) {
      toast.error(forbiddenMessage("delete", "contracts"));
      return;
    }
    if (
      !(await confirm({
        title: "Confirmar",
        message: `¿Eliminar el contrato ${current.id}? Esta acción no se puede deshacer.`,
        destructive: true,
      }))
    ) {
      return;
    }

    setDeleting(true);
    try {
      if (isDistributor) {
        await deleteDistributorContract(current.id);
      } else {
        await deleteServiceCenterContract(current.id);
      }
      toast.success("Contrato eliminado.");
      await load();
      onChanged?.();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-card-foreground">{title}</h3>
          <div className="flex flex-wrap gap-2">
            {current && canModify ? (
              <button
                type="button"
                onClick={() => {
                  setFormError(null);
                  setDialog("edit");
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-card-foreground hover:bg-foreground/5"
              >
                <Pencil className="size-3.5" aria-hidden />
                Editar
              </button>
            ) : null}
            {current && canDelete ? (
              <button
                type="button"
                disabled={deleting}
                onClick={() => void handleDelete()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-500/10 disabled:opacity-50 dark:text-rose-300"
              >
                {deleting ? (
                  <Loader2 className="size-3.5 animate-spin" aria-hidden />
                ) : (
                  <Trash2 className="size-3.5" aria-hidden />
                )}
                Eliminar
              </button>
            ) : null}
            {!current && canCreate ? (
              <button
                type="button"
                onClick={() => {
                  setFormError(null);
                  setDialog("create");
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-2.5 py-1.5 text-xs font-medium text-accent-foreground"
              >
                <Plus className="size-3.5" aria-hidden />
                Registrar contrato
              </button>
            ) : null}
          </div>
        </div>

        {loading ? (
          <p className="flex items-center gap-2 text-sm text-muted">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Cargando contrato…
          </p>
        ) : error ? (
          <p
            role="alert"
            className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-300"
          >
            {error}
          </p>
        ) : current ? (
          <>
            <DetailSection title="Contrato actual" layout="quad">
              <DetailField label="ID" value={String(current.id)} mono />
              <DetailField
                label="Vigencia"
                value={`${formatContractDate(current.startDate)} – ${formatContractDate(current.endDate)}`}
              />
              <DetailField
                label="Estado"
                value={
                  <ContractStatusBadge
                    startDate={current.startDate}
                    endDate={current.endDate}
                  />
                }
              />
              <DetailField
                label="Registrado"
                value={formatDate(current.createdAt)}
              />
            </DetailSection>
            {(current.photoUrls?.length ?? 0) > 0 ? (
              <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                <h4 className="text-sm font-medium text-card-foreground">
                  Documentos ({current.photoUrls.length})
                </h4>
                <ul className="mt-2 space-y-1.5 text-sm">
                  {current.photoUrls.map((url) => (
                    <li key={url}>
                      <a
                        href={contractDocumentViewUrl(url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-accent underline-offset-2 hover:underline"
                      >
                        {isPdfUrl(url) ? "PDF" : "Imagen"}:{" "}
                        {contractDocumentLabel(url)}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </>
        ) : (
          <p className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
            <FileText className="mt-0.5 size-4 shrink-0 opacity-80" aria-hidden />
            <span>
              No hay contrato registrado para esta{" "}
              {isDistributor ? "distribuidora" : "sucursal de centro de servicio"}
              .
            </span>
          </p>
        )}
      </div>

      {dialog ? (
        <ContractFormDialog
          kind={kind}
          mode={dialog}
          contract={dialog === "edit" ? current ?? undefined : undefined}
          partyOptions={partyOptions}
          defaultPartyId={partyId}
          lockParty
          catalogLoading={false}
          open
          saving={saving}
          error={formError}
          onClose={() => {
            if (!saving) setDialog(null);
          }}
          onSubmit={(values) => void handleSubmit(values)}
        />
      ) : null}
    </>
  );
}
