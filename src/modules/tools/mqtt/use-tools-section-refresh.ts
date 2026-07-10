"use client";

import { useCallback, useState } from "react";

export async function runToolsSectionRefresh(
  refreshStatus: () => void | Promise<void>,
  reloadSection: () => void | Promise<void>,
): Promise<void> {
  await refreshStatus();
  await reloadSection();
}

export function useToolsSectionRefresh(
  refreshStatus: () => void | Promise<void>,
  reloadSection: () => void | Promise<void>,
  statusLoading: boolean,
) {
  const [reloading, setReloading] = useState(false);

  const refreshAll = useCallback(async () => {
    setReloading(true);
    try {
      await runToolsSectionRefresh(refreshStatus, reloadSection);
    } finally {
      setReloading(false);
    }
  }, [refreshStatus, reloadSection]);

  return {
    refreshAll,
    refreshLoading: statusLoading || reloading,
  };
}
