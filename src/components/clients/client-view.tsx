"use client";

import { useCallback, useEffect, useState } from "react";
import { DetailCard, DetailField } from "@/components/resource-view/detail-fields";
import { ResourceViewShell } from "@/components/resource-view/resource-view-shell";
import { useAuth } from "@/context/auth-provider";
import { fetchBranchById } from "@/lib/branches-api";
import {
  fetchClientById,
  getClientsErrorMessage,
} from "@/lib/clients-api";
import { formatDate } from "@/lib/datetime-form";
import { useResourceId } from "@/hooks/use-resource-id";
import type { BranchResponse } from "@/types/branch";
import type { ClientResponse } from "@/types/branch-role";

export function ClientView() {
  const id = useResourceId();
  const { user } = useAuth();
  const [client, setClient] = useState<ClientResponse | null>(null);
  const [branch, setBranch] = useState<BranchResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (id == null) {
      setError("Identificador de cliente no válido.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const clientRow = await fetchClientById(id);
      if (
        user?.role === "DISTRIBUTOR" &&
        user.distributorId != null &&
        clientRow.distributorId !== user.distributorId
      ) {
        setError("No tienes acceso a este cliente.");
        setClient(null);
        setBranch(null);
        return;
      }
      setClient(clientRow);
      try {
        const branchRow = await fetchBranchById(clientRow.branchId);
        setBranch(branchRow);
      } catch {
        setBranch(null);
      }
    } catch (err) {
      setError(getClientsErrorMessage(err));
      setClient(null);
      setBranch(null);
    } finally {
      setLoading(false);
    }
  }, [id, user?.role, user?.distributorId]);

  useEffect(() => {
    void load();
  }, [load]);

  const businessName =
    client?.companyBusinessName?.trim() || "Cliente";
  const rif = client?.companyRif?.trim() || "—";
  const city = client?.branchCity?.trim() || branch?.city || "—";
  const state = client?.branchState?.trim() || branch?.state || "—";
  const title = businessName !== "Cliente" ? businessName : `${city}, ${state}`;

  return (
    <ResourceViewShell
      backHref="/clients"
      backLabel="Volver a clientes"
      title={title}
      subtitle={rif !== "—" ? rif : undefined}
      loading={loading}
      error={error}
    >
      {client && (
        <DetailCard>
          <DetailField label="ID cliente" value={String(client.id)} mono />
          <DetailField label="ID sucursal" value={String(client.branchId)} mono />
          <DetailField label="RIF" value={rif} mono />
          <DetailField
            label="Razón social"
            value={businessName}
            fullWidth
          />
          <DetailField label="Estado" value={state} />
          <DetailField label="Ciudad" value={city} />
          <DetailField
            label="Dirección"
            value={branch?.address?.trim() || "—"}
            fullWidth
          />
          <DetailField
            label="Persona de contacto"
            value={branch?.contactPersonName?.trim() || "—"}
          />
          <DetailField
            label="Teléfono"
            value={
              client.branchPhone?.trim() || branch?.phone?.trim() || "—"
            }
          />
          <DetailField
            label="Correo"
            value={
              client.branchEmail?.trim() || branch?.email?.trim() || "—"
            }
          />
          <DetailField
            label="Registrado"
            value={formatDate(branch?.createdAt ?? client.createdAt)}
          />
        </DetailCard>
      )}
    </ResourceViewShell>
  );
}
