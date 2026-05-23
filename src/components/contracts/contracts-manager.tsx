"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ContractsListPanel } from "@/components/contracts/contracts-list-panel";
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
import {
  hrefForDistributor,
  hrefForServiceCenter,
} from "@/lib/table-foreign-hrefs";
import { pageToolbarButtonClass } from "@/components/ui/page-toolbar";
import { tabToggleClass } from "@/lib/toggle-button-styles";
import { cn } from "@/lib/utils";

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
          label: `#${d.id} · ${distributorLabel(d, branches, companies)}`,
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
            : `Sucursal #${sc.branchId}`;
          return { id: sc.id, label: `#${sc.id} · ${label}` };
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
        return `Distribuidor #${(contract as DistributorContractResponse).distributorId}`;
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
        return `Centro #${(contract as ServiceCenterContractResponse).serviceCenterId}`;
      }
      const branch = branches.find((b) => b.id === sc.branchId);
      return branch
        ? formatBranchShort(branch, companies)
        : `Centro #${sc.id}`;
    },
    [serviceCenters, branches, companies],
  );

  const getDistributorHref = useCallback(
    (contract: DistributorContractResponse | ServiceCenterContractResponse) =>
      user
        ? hrefForDistributor(
            (contract as DistributorContractResponse).distributorId,
            distributors,
            user.role,
          )
        : undefined,
    [distributors, user],
  );

  const getServiceCenterHref = useCallback(
    (contract: DistributorContractResponse | ServiceCenterContractResponse) =>
      user
        ? hrefForServiceCenter(
            (contract as ServiceCenterContractResponse).serviceCenterId,
            serviceCenters,
            user.role,
          )
        : undefined,
    [serviceCenters, user],
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-center">
        <div
          className="inline-flex gap-1 rounded-lg border border-border bg-card p-1"
          role="tablist"
          aria-label="Tipo de contrato"
        >
          <button
            type="button"
            role="tab"
            aria-selected={tab === "distributor"}
            onClick={() => setTab("distributor")}
            className={tabToggleClass(
              tab === "distributor",
              "distributor",
              cn(pageToolbarButtonClass, "w-auto"),
            )}
          >
            Distribuidora
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "serviceCenter"}
            onClick={() => setTab("serviceCenter")}
            className={tabToggleClass(
              tab === "serviceCenter",
              "serviceCenter",
              cn(pageToolbarButtonClass, "w-auto"),
            )}
          >
            Centro de servicio
          </button>
        </div>
      </div>

      {tab === "distributor" ? (
        <ContractsListPanel
          kind="distributor"
          partyOptions={distributorOptions}
          catalogLoading={catalogLoading || scopeLoading}
          getPartyLabel={getDistributorLabel}
          getPartyHref={getDistributorHref}
        />
      ) : (
        <ContractsListPanel
          kind="serviceCenter"
          partyOptions={serviceCenterOptions}
          catalogLoading={catalogLoading || scopeLoading}
          getPartyLabel={getServiceCenterLabel}
          getPartyHref={getServiceCenterHref}
        />
      )}
    </div>
  );
}
