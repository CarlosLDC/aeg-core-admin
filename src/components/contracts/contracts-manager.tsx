"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ContractsListPanel } from "@/components/contracts/contracts-list-panel";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import { useAuth } from "@/context/auth-provider";
import { useCompanyScope } from "@/context/company-scope-provider";
import { distributorLabel } from "@/lib/branch-roles";
import { formatBranchShort } from "@/lib/branches";
import { fetchBranches } from "@/lib/branches-api";
import { fetchCompanies } from "@/lib/companies-api";
import { fetchDistributors } from "@/lib/distributors-api";
import { fetchServiceCenters } from "@/lib/service-centers-api";
import type { BranchResponse } from "@/types/branch";
import type { CompanyResponse } from "@/types/company";
import type {
  DistributorContractResponse,
  ServiceCenterContractResponse,
} from "@/types/contract";
import type {
  DistributorResponse,
  ServiceCenterResponse,
} from "@/types/branch-role";

type Tab = "distributor" | "serviceCenter";

export function ContractsManager() {
  const { user } = useAuth();
  const { scope, loading: scopeLoading } = useCompanyScope();
  const [tab, setTab] = useState<Tab>("distributor");
  const [branches, setBranches] = useState<BranchResponse[]>([]);
  const [companies, setCompanies] = useState<CompanyResponse[]>([]);
  const [distributors, setDistributors] = useState<DistributorResponse[]>([]);
  const [serviceCenters, setServiceCenters] = useState<ServiceCenterResponse[]>(
    [],
  );
  const [catalogLoading, setCatalogLoading] = useState(true);

  const loadCatalog = useCallback(async () => {
    setCatalogLoading(true);
    try {
      const [companyRows, branchRows, distributorRows, serviceCenterRows] =
        await Promise.all([
          scope ? Promise.resolve(scope.companies) : fetchCompanies(),
          scope ? Promise.resolve(scope.branches) : fetchBranches(),
          fetchDistributors(),
          fetchServiceCenters(),
        ]);
      setCompanies(
        [...companyRows].sort((a, b) =>
          (a.businessName || "").localeCompare(b.businessName || "", "es"),
        ),
      );
      setBranches(branchRows);
      setDistributors(distributorRows);
      setServiceCenters(serviceCenterRows);
    } finally {
      setCatalogLoading(false);
    }
  }, [scope]);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  const distributorOptions = useMemo(
    () =>
      distributors
        .map((d) => ({
          id: d.id,
          label: distributorLabel(d, branches, companies),
        }))
        .sort((a, b) => a.label.localeCompare(b.label, "es")),
    [distributors, branches, companies],
  );

  const serviceCenterOptions = useMemo(
    () =>
      serviceCenters
        .map((sc) => {
          const branch = branches.find((b) => b.id === sc.branchId);
          const label = branch
            ? formatBranchShort(branch, companies)
            : "Empresa desconocida";
          return { id: sc.id, label };
        })
        .sort((a, b) => a.label.localeCompare(b.label, "es")),
    [serviceCenters, branches, companies],
  );

  const getDistributorLabel = useCallback(
    (contract: DistributorContractResponse | ServiceCenterContractResponse) => {
      const d = distributors.find(
        (x) =>
          x.id === (contract as DistributorContractResponse).distributorId,
      );
      if (!d) {
        return "Distribuidor desconocido";
      }
      return distributorLabel(d, branches, companies);
    },
    [distributors, branches, companies],
  );

  const getServiceCenterLabel = useCallback(
    (contract: DistributorContractResponse | ServiceCenterContractResponse) => {
      const sc = serviceCenters.find(
        (x) =>
          x.id === (contract as ServiceCenterContractResponse).serviceCenterId,
      );
      if (!sc) {
        return "Centro de servicio desconocido";
      }
      const branch = branches.find((b) => b.id === sc.branchId);
      return branch
        ? formatBranchShort(branch, companies)
        : "Centro de servicio desconocido";
    },
    [serviceCenters, branches, companies],
  );

  return (
    <div className="admin-content-stack">
      <div className="flex justify-center">
        <SegmentedToggle
          value={tab}
          onChange={setTab}
          ariaLabel="Tipo de contrato"
          options={[
            { value: "distributor", label: "Distribuidora" },
            { value: "serviceCenter", label: "Centro de servicio" },
          ]}
          className="w-full max-w-md"
        />
      </div>

      {tab === "distributor" ? (
        <ContractsListPanel
          kind="distributor"
          partyOptions={distributorOptions}
          catalogLoading={catalogLoading || scopeLoading}
          getPartyLabel={getDistributorLabel}
        />
      ) : (
        <ContractsListPanel
          kind="serviceCenter"
          partyOptions={serviceCenterOptions}
          catalogLoading={catalogLoading || scopeLoading}
          getPartyLabel={getServiceCenterLabel}
        />
      )}
    </div>
  );
}
