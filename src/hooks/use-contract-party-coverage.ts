"use client";

import { useEffect, useState } from "react";
import {
  buildContractPartyCoverage,
  type ContractPartyCoverage,
} from "@/lib/branch-contract-coverage";
import { fetchDistributorContracts } from "@/lib/distributor-contracts-api";
import { fetchServiceCenterContracts } from "@/lib/service-center-contracts-api";

export function useContractPartyCoverage(enabled: boolean) {
  const [coverage, setCoverage] = useState<ContractPartyCoverage | null>(null);

  useEffect(() => {
    if (!enabled) {
      setCoverage(null);
      return;
    }

    let cancelled = false;

    void Promise.all([
      fetchDistributorContracts(),
      fetchServiceCenterContracts(),
    ])
      .then(([distributorContracts, serviceCenterContracts]) => {
        if (cancelled) return;
        setCoverage(
          buildContractPartyCoverage(
            distributorContracts,
            serviceCenterContracts,
          ),
        );
      })
      .catch(() => {
        if (!cancelled) setCoverage(null);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return coverage;
}
