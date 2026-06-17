"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getEnajenacionActiveSessions,
  getEnajenacionActivity,
} from "@/lib/mqtt-api";
import type {
  EnajenacionActiveSession,
  EnajenacionActivityEntry,
} from "@/types/mqtt";

const POLL_INTERVAL_MS = 4000;

export function useEnajenacionActivity() {
  const [entries, setEntries] = useState<EnajenacionActivityEntry[]>([]);
  const [sessions, setSessions] = useState<EnajenacionActiveSession[]>([]);
  const [macFilter, setMacFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [polling, setPolling] = useState(true);

  const refetch = useCallback(async (silent = false) => {
    if (!silent) {
      setRefreshing(true);
    }
    try {
      const [activity, activeSessions] = await Promise.all([
        getEnajenacionActivity({
          limit: 100,
          mac: macFilter.trim() || undefined,
        }),
        getEnajenacionActiveSessions(),
      ]);
      setEntries(activity.entries);
      setSessions(activeSessions);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar actividad");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [macFilter]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  useEffect(() => {
    if (!polling) {
      return;
    }
    const timer = window.setInterval(() => {
      void refetch(true);
    }, POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [polling, refetch]);

  return {
    entries,
    sessions,
    macFilter,
    setMacFilter,
    loading,
    refreshing,
    error,
    polling,
    setPolling,
    refetch,
  };
}
