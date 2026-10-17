"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAuth } from "@/context/auth-provider";
import { fetchAuthMe } from "@/lib/auth-me-api";
import { getPrintersErrorMessage } from "@/lib/printers-api";
import { filterPrintersForUser } from "@/lib/scope-filters";
import {
  countPrintersByStatus,
  filterPrinters,
  type PrinterStatusCounts,
  type ToolsStatusBucket,
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
import type { DistributorPrinterQuickFilter } from "@/lib/distributor-printer-filters";
import type { TableSortState } from "@/lib/table-sort";
import { PRINTER_STATUSES, type PrinterStatus } from "@/types/printer";

export type ToolsPrinterSortKey = "serial";

export const DEFAULT_TOOLS_SORT: TableSortState<ToolsPrinterSortKey> = {
  key: "serial",
  direction: "asc",
};

export const DEFAULT_TOOLS_PAGE_SIZE = 5;

export const TOOLS_TABLE_STORAGE_KEY = "aeg_tools_table_state";

export interface ToolsTableState {
  query: string;
  statusBucket: ToolsStatusBucket;
  distributorFilter: DistributorPrinterQuickFilter;
  adminStatusFilter: PrinterStatus | "all";
  sort: TableSortState<ToolsPrinterSortKey>;
  page: number;
  pageSize: number;
}

export function readStoredToolsTableState(): Partial<ToolsTableState> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(TOOLS_TABLE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;

    const result: Partial<ToolsTableState> = {};
    if (typeof parsed.query === "string") {
      result.query = parsed.query;
    }
    if (
      parsed.statusBucket === "all" ||
      parsed.statusBucket === "enajenada" ||
      parsed.statusBucket === "no_enajenada" ||
      parsed.statusBucket === "en_consignacion" ||
      parsed.statusBucket === "sin_asignar"
    ) {
      result.statusBucket = parsed.statusBucket;
    }
    if (
      parsed.distributorFilter === "all" ||
      PRINTER_STATUSES.includes(parsed.distributorFilter)
    ) {
      result.distributorFilter = parsed.distributorFilter;
    }
    if (
      parsed.adminStatusFilter === "all" ||
      PRINTER_STATUSES.includes(parsed.adminStatusFilter)
    ) {
      result.adminStatusFilter = parsed.adminStatusFilter;
    }
    if (
      parsed.sort &&
      parsed.sort.key === "serial" &&
      (parsed.sort.direction === "asc" || parsed.sort.direction === "desc")
    ) {
      result.sort = parsed.sort;
    }
    if (typeof parsed.page === "number" && parsed.page >= 1) {
      result.page = Math.floor(parsed.page);
    }
    if (typeof parsed.pageSize === "number" && parsed.pageSize >= 1) {
      result.pageSize = Math.floor(parsed.pageSize);
    }
    return result;
  } catch {
    return null;
  }
}

export function saveStoredToolsTableState(state: ToolsTableState) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(
      TOOLS_TABLE_STORAGE_KEY,
      JSON.stringify(state),
    );
  } catch {
    /* private browsing / quota */
  }
}

export function clearStoredToolsTableState() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(TOOLS_TABLE_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export type ToolsSectionContextValue = {
  role: Role | undefined;
  printers: ToolsPrinter[];
  allPrinters: ToolsPrinter[];
  loading: boolean;
  error: string | null;
  query: string;
  setQuery: (query: string) => void;
  reload: () => Promise<void>;
  findBySerial: (serial: string) => ToolsPrinter | null;
  statusCounts: PrinterStatusCounts;
  statusBucket: ToolsStatusBucket;
  setStatusBucket: React.Dispatch<React.SetStateAction<ToolsStatusBucket>>;
  distributorFilter: DistributorPrinterQuickFilter;
  setDistributorFilter: React.Dispatch<
    React.SetStateAction<DistributorPrinterQuickFilter>
  >;
  adminStatusFilter: PrinterStatus | "all";
  setAdminStatusFilter: React.Dispatch<
    React.SetStateAction<PrinterStatus | "all">
  >;
  sort: TableSortState<ToolsPrinterSortKey>;
  setSort: React.Dispatch<
    React.SetStateAction<TableSortState<ToolsPrinterSortKey>>
  >;
  page: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  pageSize: number;
  setPageSize: React.Dispatch<React.SetStateAction<number>>;
  resetTableState: () => void;
};

export const ToolsSectionContext =
  createContext<ToolsSectionContextValue | null>(null);

export function ToolsSectionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const [allPrinters, setAllPrinters] = useState<ToolsPrinter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [distributorId, setDistributorId] = useState<number | null>(
    user?.distributorId ?? null,
  );

  const [initialState] = useState(() => {
    const stored = readStoredToolsTableState();
    return {
      query: stored?.query ?? "",
      statusBucket: stored?.statusBucket ?? ("all" as ToolsStatusBucket),
      distributorFilter:
        stored?.distributorFilter ??
        ("all" as DistributorPrinterQuickFilter),
      adminStatusFilter:
        stored?.adminStatusFilter ?? ("all" as PrinterStatus | "all"),
      sort: stored?.sort ?? DEFAULT_TOOLS_SORT,
      page: stored?.page ?? 1,
      pageSize: stored?.pageSize ?? DEFAULT_TOOLS_PAGE_SIZE,
    };
  });

  const [query, setQuery] = useState(initialState.query);
  const [statusBucket, setStatusBucket] = useState<ToolsStatusBucket>(
    initialState.statusBucket,
  );
  const [distributorFilter, setDistributorFilter] =
    useState<DistributorPrinterQuickFilter>(initialState.distributorFilter);
  const [adminStatusFilter, setAdminStatusFilter] = useState<
    PrinterStatus | "all"
  >(initialState.adminStatusFilter);
  const [sort, setSort] =
    useState<TableSortState<ToolsPrinterSortKey>>(initialState.sort);
  const [page, setPage] = useState<number>(initialState.page);
  const [pageSize, setPageSize] = useState<number>(initialState.pageSize);

  useEffect(() => {
    saveStoredToolsTableState({
      query,
      statusBucket,
      distributorFilter,
      adminStatusFilter,
      sort,
      page,
      pageSize,
    });
  }, [
    query,
    statusBucket,
    distributorFilter,
    adminStatusFilter,
    sort,
    page,
    pageSize,
  ]);

  useEffect(() => {
    return () => {
      clearStoredToolsTableState();
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    if (
      !isDistributorPanelRole(user.role) &&
      !isServiceCenterStaffRole(user.role)
    ) {
      const targetId = user.distributorId ?? null;
      queueMicrotask(() => setDistributorId(targetId));
      return;
    }
    if (user.distributorId != null) {
      const targetId = user.distributorId;
      queueMicrotask(() => setDistributorId(targetId));
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
  }, [user]);

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
        distributors: catalog.distributors,
        branches: catalog.branches,
        companies: catalog.companies,
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
    queueMicrotask(() => {
      void load();
    });
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

  const resetTableState = useCallback(() => {
    setQuery("");
    setStatusBucket("all");
    setDistributorFilter("all");
    setAdminStatusFilter("all");
    setSort(DEFAULT_TOOLS_SORT);
    setPage(1);
    setPageSize(DEFAULT_TOOLS_PAGE_SIZE);
    clearStoredToolsTableState();
  }, []);

  const value = useMemo<ToolsSectionContextValue>(
    () => ({
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
      statusBucket,
      setStatusBucket,
      distributorFilter,
      setDistributorFilter,
      adminStatusFilter,
      setAdminStatusFilter,
      sort,
      setSort,
      page,
      setPage,
      pageSize,
      setPageSize,
      resetTableState,
    }),
    [
      user?.role,
      printers,
      allPrinters,
      loading,
      error,
      query,
      load,
      findBySerial,
      statusCounts,
      statusBucket,
      distributorFilter,
      adminStatusFilter,
      sort,
      page,
      pageSize,
      resetTableState,
    ],
  );

  return (
    <ToolsSectionContext.Provider value={value}>
      {children}
    </ToolsSectionContext.Provider>
  );
}

export function useToolsSectionContext() {
  return useContext(ToolsSectionContext);
}
