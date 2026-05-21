"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/auth-provider";
import { fetchAuthMe } from "@/lib/auth-me-api";

export function useDistributorIdState(): {
  distributorId: number | null;
  loading: boolean;
} {
  const { user } = useAuth();
  const [distributorId, setDistributorId] = useState<number | null>(
    user?.distributorId ?? null,
  );
  const [loading, setLoading] = useState<boolean>(
    user?.role === "DISTRIBUTOR" && user.distributorId == null,
  );

  useEffect(() => {
    if (user?.role !== "DISTRIBUTOR") {
      setDistributorId(null);
      setLoading(false);
      return;
    }
    if (user.distributorId != null) {
      setDistributorId(user.distributorId);
      setLoading(false);
      return;
    }
    setLoading(true);
    void fetchAuthMe()
      .then((me) => setDistributorId(me.distributorId ?? null))
      .catch(() => setDistributorId(null))
      .finally(() => setLoading(false));
  }, [user?.role, user?.distributorId]);

  return { distributorId, loading };
}

export function useDistributorId(): number | null {
  return useDistributorIdState().distributorId;
}
