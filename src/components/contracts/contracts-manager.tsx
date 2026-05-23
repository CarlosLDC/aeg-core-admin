"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ContractsListPanel } from "@/components/contracts/contracts-list-panel";
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
import { cn } from "@/lib/utils";

type Tab = "distributor" | "serviceCenter";

export function ContractsManager() {
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
      hrefForDistributor(
        (contract as DistributorContractResponse).distributorId,
        distributors,
      ),
    [distributors],
  );

  const getServiceCenterHref = useCallback(
    (contract: DistributorContractResponse | ServiceCenterContractResponse) =>
      hrefForServiceCenter(
        (contract as ServiceCenterContractResponse).serviceCenterId,
        serviceCenters,
      ),
    [serviceCenters],
  );

  return (
    <div className="space-y-4">
      <p className="min-w-0 text-sm text-muted">
        Contratos con distribuidoras o centros de servicio. Solo un
        administrador puede gestionarlos.
      </p>

      <div className="flex flex-col gap-1 rounded-lg border border-border bg-card p-1 sm:flex-row">
        <button
          type="button"
          onClick={() => setTab("distributor")}
          className={cn(
            "rounded-md px-4 py-2.5 text-sm font-medium transition-colors sm:flex-1",
            tab === "distributor"
              ? "bg-accent text-accent-foreground"
              : "text-muted hover:text-foreground",
          )}
        >
          Distribuidora
        </button>
        <button
          type="button"
          onClick={() => setTab("serviceCenter")}
          className={cn(
            "rounded-md px-4 py-2.5 text-sm font-medium transition-colors sm:flex-1",
            tab === "serviceCenter"
              ? "bg-accent text-accent-foreground"
              : "text-muted hover:text-foreground",
          )}
        >
          Centro de servicio
        </button>
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
