"use client";

import { useEffect, useState } from "react";
import { DetailCard, DetailField } from "@/components/resource-view/detail-fields";
import { ResourceViewShell } from "@/components/resource-view/resource-view-shell";
import { useResourceId } from "@/hooks/use-resource-id";
import { formatDate } from "@/lib/datetime-form";
import {
  fetchDistributorContractById,
  getDistributorContractsErrorMessage,
} from "@/lib/distributor-contracts-api";
import {
  fetchServiceCenterContractById,
  getServiceCenterContractsErrorMessage,
} from "@/lib/service-center-contracts-api";
import type {
  DistributorContractResponse,
  ServiceCenterContractResponse,
} from "@/types/contract";

type ContractViewProps = {
  kind: "distributor" | "serviceCenter";
};

export function ContractView({ kind }: ContractViewProps) {
  const id = useResourceId();
  const [contract, setContract] = useState<
    DistributorContractResponse | ServiceCenterContractResponse | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isDistributor = kind === "distributor";
  const backHref = "/contracts";
  const backLabel = "Volver a contratos";

  useEffect(() => {
    if (id == null) {
      setError("Identificador de contrato no válido.");
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    const load = isDistributor
      ? fetchDistributorContractById(id)
      : fetchServiceCenterContractById(id);

    load
      .then((data) => {
        if (!cancelled) setContract(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            isDistributor
              ? getDistributorContractsErrorMessage(err)
              : getServiceCenterContractsErrorMessage(err),
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, isDistributor]);

  const partyId = contract
    ? isDistributor
      ? (contract as DistributorContractResponse).distributorId
      : (contract as ServiceCenterContractResponse).serviceCenterId
    : null;

  const title = isDistributor
    ? `Contrato distribuidor #${id ?? ""}`
    : `Contrato centro de servicio #${id ?? ""}`;

  return (
    <ResourceViewShell
      backHref={backHref}
      backLabel={backLabel}
      title={title}
      loading={loading}
      error={error}
    >
      {contract && (
        <>
          <DetailCard>
            <DetailField label="ID" value={String(contract.id)} mono />
            <DetailField
              label={isDistributor ? "Distribuidor (ID)" : "Centro servicio (ID)"}
              value={String(partyId)}
              mono
            />
            <DetailField
              label="Inicio"
              value={formatDate(contract.startDate)}
            />
            <DetailField label="Fin" value={formatDate(contract.endDate)} />
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
                {contract.photoUrls.map((url, index) => (
                  <li key={url}>
                    <a
                      href={`/api/uploads/documents?url=${encodeURIComponent(url)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent underline-offset-2 hover:underline"
                    >
                      Documento {index + 1}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </ResourceViewShell>
  );
}
