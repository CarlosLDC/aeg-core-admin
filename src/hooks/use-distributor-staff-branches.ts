"use client";

import { useEffect, useMemo, useState } from "react";
import { loadDistributorStaffBranches } from "@/lib/distributor-scope";
import type { BranchResponse } from "@/types/branch";

/** Sucursal(es) de la propia distribuidora (personal interno), no de clientes. */
export function useDistributorStaffBranches(distributorId: number | null) {
  const [staffBranches, setStaffBranches] = useState<BranchResponse[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (distributorId == null) {
      setStaffBranches([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void loadDistributorStaffBranches(distributorId)
      .then((branches) => {
        if (!cancelled) setStaffBranches(branches);
      })
      .catch(() => {
        if (!cancelled) setStaffBranches([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [distributorId]);

  const staffBranchIdSet = useMemo(
    () => new Set(staffBranches.map((b) => b.id)),
    [staffBranches],
  );

  return { staffBranches, staffBranchIdSet, loading };
}
