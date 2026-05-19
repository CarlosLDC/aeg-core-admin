"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/auth-provider";
import { fetchAuthMe } from "@/lib/auth-me-api";

export function useDistributorId(): number | null {
  const { user } = useAuth();
  const [distributorId, setDistributorId] = useState<number | null>(
    user?.distributorId ?? null,
  );

  useEffect(() => {
    if (user?.role !== "DISTRIBUTOR") {
      setDistributorId(null);
      return;
    }
    if (user.distributorId != null) {
      setDistributorId(user.distributorId);
      return;
    }
    void fetchAuthMe()
      .then((me) => setDistributorId(me.distributorId ?? null))
      .catch(() => setDistributorId(null));
  }, [user?.role, user?.distributorId]);

  return distributorId;
}
