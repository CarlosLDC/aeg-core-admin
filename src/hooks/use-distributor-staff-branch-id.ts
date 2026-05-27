"use client";

import { useEffect, useState } from "react";
import { fetchDistributorById } from "@/lib/distributors-api";

export function useDistributorStaffBranchId(
  distributorId: number | null,
): number | null {
  const [staffBranchId, setStaffBranchId] = useState<number | null>(null);

  useEffect(() => {
    if (distributorId == null) {
      setStaffBranchId(null);
      return;
    }

    let cancelled = false;
    void fetchDistributorById(distributorId)
      .then((distributor) => {
        if (!cancelled) setStaffBranchId(distributor.branchId);
      })
      .catch(() => {
        if (!cancelled) setStaffBranchId(null);
      });

    return () => {
      cancelled = true;
    };
  }, [distributorId]);

  return staffBranchId;
}
