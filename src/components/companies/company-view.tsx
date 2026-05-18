"use client";

import { useEffect, useState } from "react";
import { ContributorBadge } from "@/components/companies/contributor-badge";
import { DetailCard, DetailField } from "@/components/resource-view/detail-fields";
import { ResourceViewShell } from "@/components/resource-view/resource-view-shell";
import { useResourceId } from "@/hooks/use-resource-id";
import {
  fetchCompanyById,
  getCompaniesErrorMessage,
} from "@/lib/companies-api";
import { formatDate } from "@/lib/datetime-form";
import type { CompanyResponse } from "@/types/company";

export function CompanyView() {
  const id = useResourceId();
  const [company, setCompany] = useState<CompanyResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id == null) {
      setError("Identificador de empresa no válido.");
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchCompanyById(id)
      .then((data) => {
        if (!cancelled) setCompany(data);
      })
      .catch((err) => {
        if (!cancelled) setError(getCompaniesErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  const title = company?.businessName || company?.rif || "Empresa";

  return (
    <ResourceViewShell
      backHref="/companies"
      backLabel="Volver a empresas"
      title={title}
      subtitle={company?.rif}
      loading={loading}
      error={error}
    >
      {company && (
        <DetailCard>
          <DetailField label="ID" value={String(company.id)} mono />
          <DetailField label="RIF" value={company.rif} mono />
          <DetailField
            label="Razón social"
            value={company.businessName || "—"}
            fullWidth
          />
          <DetailField
            label="Tipo de contribuyente"
            value={<ContributorBadge type={company.contributorType} />}
          />
          <DetailField
            label="Registrada"
            value={formatDate(company.createdAt)}
          />
        </DetailCard>
      )}
    </ResourceViewShell>
  );
}
