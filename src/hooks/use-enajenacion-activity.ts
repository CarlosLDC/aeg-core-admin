"use client";

import { useCallback, useEffect, useState } from "react";
import {
  clearEnajenacionActivity,
  getEnajenacionActiveSessions,
  getEnajenacionActivity,
} from "@/lib/mqtt-api";
import type {
  EnajenacionActiveSession,
  EnajenacionActivityDirection,
  EnajenacionActivityEntry,
  EnajenacionActivityResult,
} from "@/types/mqtt";

const POLL_INTERVAL_MS = 4000;
const PAGE_SIZE = 100;

export type ActivityDirectionFilter =
  | ""
  | EnajenacionActivityDirection
  | "SESSION";

export function useEnajenacionActivity() {
  const [entries, setEntries] = useState<EnajenacionActivityEntry[]>([]);
  const [sessions, setSessions] = useState<EnajenacionActiveSession[]>([]);
  const [macFilter, setMacFilter] = useState("");
  const [serialFilter, setSerialFilter] = useState("");
  const [resultFilter, setResultFilter] = useState<EnajenacionActivityResult | "">("");
  const [directionFilter, setDirectionFilter] =
    useState<ActivityDirectionFilter>("");
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [polling, setPolling] = useState(true);

  const hasMore = entries.length < total;

  const refetch = useCallback(
    async (options?: { silent?: boolean; nextPage?: number; append?: boolean }) => {
      const silent = options?.silent ?? false;
      const nextPage = options?.nextPage ?? 0;
      const append = options?.append ?? false;

      if (append) {
        setLoadingMore(true);
      } else if (!silent) {
        setRefreshing(true);
      }

      try {
        const [activity, activeSessions] = await Promise.all([
          getEnajenacionActivity({
            limit: PAGE_SIZE,
            page: nextPage,
            mac: macFilter.trim() || undefined,
            ptrReg: serialFilter.trim() || undefined,
            result: resultFilter || undefined,
            direction:
              directionFilter === "SESSION" || directionFilter === ""
                ? undefined
                : directionFilter,
            sessionOnly: directionFilter === "SESSION",
          }),
          getEnajenacionActiveSessions(),
        ]);
        setEntries((current) =>
          append ? [...current, ...activity.entries] : activity.entries,
        );
        setTotal(activity.total);
        setPage(nextPage);
        setSessions(activeSessions);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al cargar actividad");
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [directionFilter, macFilter, resultFilter, serialFilter],
  );

  useEffect(() => {
    void refetch();
  }, [refetch]);

  useEffect(() => {
    if (!polling) {
      return;
    }
    const timer = window.setInterval(() => {
      void refetch({ silent: true, nextPage: 0, append: false });
    }, POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [polling, refetch]);

  const loadMore = useCallback(() => {
    if (!hasMore || loadingMore) return;
    void refetch({ silent: true, nextPage: page + 1, append: true });
  }, [hasMore, loadingMore, page, refetch]);

  const clear = useCallback(async () => {
    setClearing(true);
    try {
      await clearEnajenacionActivity();
      setEntries([]);
      setTotal(0);
      setPage(0);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al limpiar actividad");
      throw err;
    } finally {
      setClearing(false);
    }
  }, []);

  return {
    entries,
    sessions,
    macFilter,
    setMacFilter,
    serialFilter,
    setSerialFilter,
    resultFilter,
    setResultFilter,
    directionFilter,
    setDirectionFilter,
    total,
    hasMore,
    loading,
    refreshing,
    clearing,
    loadingMore,
    error,
    polling,
    setPolling,
    refetch: () => refetch(),
    clear,
    loadMore,
  };
}
