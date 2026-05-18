"use client";

import { useEffect, useState } from "react";
import { DetailCard, DetailField } from "@/components/resource-view/detail-fields";
import { ResourceViewShell } from "@/components/resource-view/resource-view-shell";
import { useCompanyScope } from "@/context/company-scope-provider";
import { useResourceId } from "@/hooks/use-resource-id";
import {
  fetchBranchById,
  getBranchesErrorMessage,
} from "@/lib/branches-api";
import { companyNameById } from "@/lib/branches";
import { formatDate } from "@/lib/datetime-form";
import { companyPath } from "@/lib/resource-routes";
import type { BranchResponse } from "@/types/branch";

export function BranchView() {
  const id = useResourceId();
  const { scope } = useCompanyScope();
  const [branch, setBranch] = useState<BranchResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id == null) {
      setError("Identificador de sucursal no válido.");
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchBranchById(id)
      .then((data) => {
        if (!cancelled) setBranch(data);
      })
      .catch((err) => {
        if (!cancelled) setError(getBranchesErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  const companies = scope?.companies ?? [];
  const companyLabel = branch
    ? companyNameById(companies, branch.companyId)
    : "";
  const title = branch
    ? `${branch.city}, ${branch.state}`
    : "Sucursal";

  return (
    <ResourceViewShell
      backHref="/branches"
      backLabel="Volver a sucursales"
      title={title}
      subtitle={companyLabel}
      loading={loading}
      error={error}
    >
      {branch && (
        <DetailCard>
          <DetailField label="ID" value={String(branch.id)} mono />
          <DetailField
            label="Empresa"
            value={companyLabel}
            href={companyPath(branch.companyId)}
            fullWidth
          />
          <DetailField label="Ciudad" value={branch.city} />
          <DetailField label="Estado" value={branch.state} />
          <DetailField
            label="Dirección"
            value={branch.address || "—"}
            fullWidth
          />
          <DetailField label="Teléfono" value={branch.phone || "—"} />
          <DetailField label="Correo" value={branch.email || "—"} />
          <DetailField
            label="Registrada"
            value={formatDate(branch.createdAt)}
          />
        </DetailCard>
      )}
    </ResourceViewShell>
  );
}
