"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/auth-provider";
import { fetchAuthMe } from "@/lib/auth-me-api";
import { getPrintersErrorMessage } from "@/lib/printers-api";
import { filterPrintersForUser } from "@/lib/scope-filters";
import {
  countPrintersByStatus,
  filterPrinters,
} from "@/modules/tools/shared/formatters";
import {
  findToolsPrinterBySerial,
  mapCorePrintersToTools,
} from "@/modules/tools/shared/map-core-printer";
import type { ToolsPrinter } from "@/modules/tools/shared/types";
import { loadToolsPrinterCatalog } from "@/modules/tools/printers/tools-printers-api";
import {
  isDistributorPanelRole,
  isServiceCenterStaffRole,
  type Role,
} from "@/types/user";

export function useToolsPrinters() {
  const { user } = useAuth();
  const [allPrinters, setAllPrinters] = useState<ToolsPrinter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [distributorId, setDistributorId] = useState<number | null>(
    user?.distributorId ?? null,
  );

  useEffect(() => {
    if (!user) return;
    if (
      !isDistributorPanelRole(user.role) &&
      !isServiceCenterStaffRole(user.role)
    ) {
      setDistributorId(user.distributorId ?? null);
      return;
    }
    if (user.distributorId != null) {
      setDistributorId(user.distributorId);
      return;
    }

    let cancelled = false;
    fetchAuthMe()
      .then((me) => {
        if (!cancelled) setDistributorId(me.distributorId ?? null);
      })
      .catch(() => {
        if (!cancelled) setDistributorId(null);
      });

    return () => {
      cancelled = true;
    };
  }, [user?.role, user?.distributorId]);

  const load = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const catalog = await loadToolsPrinterCatalog();
      const scoped = filterPrintersForUser(
        catalog.printers,
        user.role,
        distributorId,
      );
      const mapped = mapCorePrintersToTools({
        printers: scoped,
        clients: catalog.clients,
        models: catalog.models,
        role: user.role,
      });
      setAllPrinters(mapped);
    } catch (err) {
      setError(getPrintersErrorMessage(err));
      setAllPrinters([]);
    } finally {
      setLoading(false);
    }
  }, [user, distributorId]);

  useEffect(() => {
    void load();
  }, [load]);

  const printers = useMemo(
    () => filterPrinters(allPrinters, query),
    [allPrinters, query],
  );

  const statusCounts = useMemo(
    () => countPrintersByStatus(allPrinters),
    [allPrinters],
  );

  const findBySerial = useCallback(
    (serial: string) => findToolsPrinterBySerial(allPrinters, serial),
    [allPrinters],
  );

  return {
    role: user?.role as Role | undefined,
    printers,
    allPrinters,
    loading,
    error,
    query,
    setQuery,
    reload: load,
    findBySerial,
    statusCounts,
  };
}
