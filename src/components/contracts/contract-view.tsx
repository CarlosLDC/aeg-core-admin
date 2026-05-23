"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ContractFormDialog } from "@/components/contracts/contract-form-dialog";
import { ContractStatusBadge } from "@/components/contracts/contract-status-badge";
import { DetailCard, DetailField } from "@/components/resource-view/detail-fields";
import { ResourceViewActions } from "@/components/resource-view/resource-view-actions";
import { ResourceViewShell } from "@/components/resource-view/resource-view-shell";
import { useAuth } from "@/context/auth-provider";
import { useCompanyScope } from "@/context/company-scope-provider";
import { useToast } from "@/context/toast-provider";
import { useConfirm } from "@/context/confirm-provider";
import {
  canDeleteContractRecord,
  canManageContracts,
} from "@/lib/api-permissions";
import { forbiddenMessage } from "@/lib/permissions/messages";
import { useResourceId } from "@/hooks/use-resource-id";
import { distributorLabel } from "@/lib/branch-roles";
import { formatBranchShort } from "@/lib/branches";
import { fetchBranches } from "@/lib/branches-api";
import { fetchCompanies } from "@/lib/companies-api";
import {
  formatContractDate,
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
  deleteDistributorContract,
  fetchDistributorContractById,
  getDistributorContractsErrorMessage,
  updateDistributorContract,
} from "@/lib/distributor-contracts-api";
import { fetchDistributors } from "@/lib/distributors-api";
import {
  deleteServiceCenterContract,
  fetchServiceCenterContractById,
  getServiceCenterContractsErrorMessage,
  updateServiceCenterContract,
} from "@/lib/service-center-contracts-api";
import { fetchServiceCenters } from "@/lib/service-centers-api";
import { formatDate } from "@/lib/datetime-form";
import {
  distributorContractPath,
  serviceCenterContractPath,
} from "@/lib/resource-routes";
import type {
  DistributorContractResponse,
  ServiceCenterContractResponse,
} from "@/types/contract";
import type {
  DistributorResponse,
  ServiceCenterResponse,
} from "@/types/branch-role";
import type { BranchResponse } from "@/types/branch";
import type { CompanyResponse } from "@/types/company";

type ContractViewProps = {
  kind: "distributor" | "serviceCenter";
};

export function ContractView({ kind }: ContractViewProps) {
  const id = useResourceId();
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const { user } = useAuth();
  const { scope } = useCompanyScope();
  const canModify = user ? canManageContracts(user.role) : false;
  const canDelete = user ? canDeleteContractRecord(user.role) : false;
  const isDistributor = kind === "distributor";

  const [contract, setContract] = useState<
    DistributorContractResponse | ServiceCenterContractResponse | null
  >(null);
  const [branches, setBranches] = useState<BranchResponse[]>([]);
  const [companies, setCompanies] = useState<CompanyResponse[]>([]);
  const [distributors, setDistributors] = useState<DistributorResponse[]>([]);
  const [serviceCenters, setServiceCenters] = useState<ServiceCenterResponse[]>(
    [],
  );
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const partyOptions = useMemo(() => {
    if (isDistributor) {
      return distributors
        .map((d) => ({
          id: d.id,
          label: `#${d.id} · ${distributorLabel(d, branches, companies)}`,
        }))
        .sort((a, b) => a.label.localeCompare(b.label, "es"));
    }
    return serviceCenters
      .map((sc) => {
        const branch = branches.find((b) => b.id === sc.branchId);
        const label = branch
          ? formatBranchShort(branch, companies)
          : `Centro #${sc.id}`;
        return { id: sc.id, label: `#${sc.id} · ${label}` };
      })
      .sort((a, b) => a.label.localeCompare(b.label, "es"));
  }, [isDistributor, distributors, serviceCenters, branches, companies]);

  const partyLabel = useMemo(() => {
    if (!contract) return "";
    const partyId = isDistributor
      ? (contract as DistributorContractResponse).distributorId
      : (contract as ServiceCenterContractResponse).serviceCenterId;
    return partyOptions.find((p) => p.id === partyId)?.label ?? `#${partyId}`;
  }, [contract, isDistributor, partyOptions]);

  const load = useCallback(async () => {
    if (id == null) {
      setError("Identificador de contrato no válido.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = isDistributor
        ? await fetchDistributorContractById(id)
        : await fetchServiceCenterContractById(id);
      setContract(data);
    } catch (err) {
      setError(
        isDistributor
          ? getDistributorContractsErrorMessage(err)
          : getServiceCenterContractsErrorMessage(err),
      );
    } finally {
      setLoading(false);
    }
  }, [id, isDistributor]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    setCatalogLoading(true);
    Promise.all([
      scope ? Promise.resolve(scope.companies) : fetchCompanies(),
      scope ? Promise.resolve(scope.branches) : fetchBranches(),
      fetchDistributors(),
      fetchServiceCenters(),
    ])
      .then(([companyRows, branchRows, distributorRows, serviceCenterRows]) => {
        if (cancelled) return;
        setCompanies(companyRows);
        setBranches(branchRows);
        setDistributors(distributorRows);
        setServiceCenters(serviceCenterRows);
      })
      .finally(() => {
        if (!cancelled) setCatalogLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [scope]);

  async function handleSubmit(values: ContractFormValues) {
    if (!contract) return;
    if (!canModify) {
      setFormError(forbiddenMessage("update", "contracts"));
      return;
    }

    setSaving(true);
    setFormError(null);

    try {
      if (isDistributor) {
        const body = toDistributorContractBody(values);
        if (typeof body === "string") {
          setFormError(body);
          return;
        }
        const updated = await updateDistributorContract(contract.id, body);
        setContract(updated);
        toast.success("Contrato actualizado.", {
          href: distributorContractPath(updated.id),
        });
      } else {
        const body = toServiceCenterContractBody(values);
        if (typeof body === "string") {
          setFormError(body);
          return;
        }
        const updated = await updateServiceCenterContract(contract.id, body);
        setContract(updated);
        toast.success("Contrato actualizado.", {
          href: serviceCenterContractPath(updated.id),
        });
      }
      setEditOpen(false);
    } catch (err) {
      const message = isDistributor
        ? getDistributorContractsErrorMessage(err)
        : getServiceCenterContractsErrorMessage(err);
      setFormError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!contract) return;
    if (!canDelete) {
      toast.error(forbiddenMessage("delete", "contracts"));
      return;
    }
    if (!(await confirm({ title: "Confirmar", message: `¿Eliminar el contrato #${contract.id} (${partyLabel})? Esta acción no se puede deshacer.`, destructive: true }))) {
      return;
    }

    setDeleting(true);
    try {
      if (isDistributor) {
        await deleteDistributorContract(contract.id);
      } else {
        await deleteServiceCenterContract(contract.id);
      }
      toast.success("Contrato eliminado.");
      router.push("/contracts");
    } catch (err) {
      const message = isDistributor
        ? getDistributorContractsErrorMessage(err)
        : getServiceCenterContractsErrorMessage(err);
      toast.error(message);
    } finally {
      setDeleting(false);
    }
  }

  const title = isDistributor
    ? `Contrato distribuidor #${id ?? ""}`
    : `Contrato centro de servicio #${id ?? ""}`;

  return (
    <>
      <ResourceViewShell
        backHref="/contracts"
        backLabel="Volver a contratos"
        title={title}
        subtitle={partyLabel}
        loading={loading}
        error={error}
        actions={
          contract ? (
            <ResourceViewActions
              onEdit={
                canModify
                  ? () => {
                      setFormError(null);
                      setEditOpen(true);
                    }
                  : undefined
              }
              onDelete={canDelete ? () => void handleDelete() : undefined}
              deleting={deleting}
            />
          ) : undefined
        }
      >
        {contract && (
          <>
            <DetailCard>
              <DetailField label="ID" value={String(contract.id)} mono />
              <DetailField
                label={isDistributor ? "Distribuidora" : "Centro de servicio"}
                value={partyLabel}
                fullWidth
              />
              <DetailField
                label="Vigencia"
                value={`${formatContractDate(contract.startDate)} – ${formatContractDate(contract.endDate)}`}
              />
              <DetailField
                label="Estado"
                value={
                  <ContractStatusBadge
                    startDate={contract.startDate}
                    endDate={contract.endDate}
                  />
                }
              />
              <DetailField
                label="Registrado"
                value={formatDate(contract.createdAt)}
              />
            </DetailCard>
            {contract.photoUrls.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                <h3 className="text-sm font-medium text-card-foreground">
                  Documentos ({contract.photoUrls.length})
                </h3>
                <ul className="mt-3 space-y-2 text-sm">
                  {contract.photoUrls.map((url) => (
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
            )}
          </>
        )}
      </ResourceViewShell>

      {contract && editOpen && (
        <ContractFormDialog
          kind={isDistributor ? "distributor" : "serviceCenter"}
          mode="edit"
          contract={contract}
          partyOptions={partyOptions}
          catalogLoading={catalogLoading}
          open={editOpen}
          saving={saving}
          error={formError}
          onClose={() => {
            if (!saving) setEditOpen(false);
          }}
          onSubmit={handleSubmit}
        />
      )}
    </>
  );
}
