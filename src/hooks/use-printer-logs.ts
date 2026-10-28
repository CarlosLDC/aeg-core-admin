"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getMqttWebSocketUrl } from "@/lib/mqtt-api";
import {
  deletePrinterLogs,
  fetchPrinterLogs,
  getPrinterLogsErrorMessage,
} from "@/lib/printer-logs-api";
import type {
  DeletePrinterLogsParams,
  PrinterLogsFilterParams,
  PrinterMqttLogItem,
} from "@/types/printer-logs";
import type { MqttMonitorWireMessage } from "@/types/mqtt";

export function usePrinterLogs(printerId: number, macAddress: string | null) {
  const [logs, setLogs] = useState<PrinterMqttLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(50);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [search, setSearch] = useState<string>("");
  const [order, setOrder] = useState<"asc" | "desc">("desc");

  const [liveEnabled, setLiveEnabled] = useState(true);
  const [liveConnected, setLiveConnected] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const compactMac = macAddress ? macAddress.replace(/[:-]/g, "").toUpperCase() : null;

  const loadLogs = useCallback(
    async (currentPage = page, silent = false) => {
      if (!silent) {
        setLoading(true);
      }
      setError(null);
      try {
        const filterParams: PrinterLogsFilterParams = {
          page: currentPage,
          limit,
          order,
        };
        if (from) filterParams.from = new Date(from).toISOString();
        if (to) filterParams.to = new Date(to).toISOString();
        if (search.trim()) filterParams.q = search.trim();

        const res = await fetchPrinterLogs(printerId, filterParams);
        setLogs(res.logs);
        setTotal(res.total);
      } catch (err) {
        setError(getPrinterLogsErrorMessage(err));
      } finally {
        setLoading(false);
      }
    },
    [printerId, page, limit, order, from, to, search],
  );

  useEffect(() => {
    let cancelled = false;
    const filterParams: PrinterLogsFilterParams = {
      page,
      limit,
      order,
    };
    if (from) filterParams.from = new Date(from).toISOString();
    if (to) filterParams.to = new Date(to).toISOString();
    if (search.trim()) filterParams.q = search.trim();

    fetchPrinterLogs(printerId, filterParams)
      .then((res) => {
        if (!cancelled) {
          setLogs(res.logs);
          setTotal(res.total);
          setError(null);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(getPrinterLogsErrorMessage(err));
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [printerId, page, limit, order, from, to, search]);

  // WebSocket Live Connection
  useEffect(() => {
    if (!liveEnabled || !compactMac) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      return;
    }

    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket(getMqttWebSocketUrl());
      wsRef.current = ws;

      ws.onopen = () => setLiveConnected(true);
      ws.onclose = () => {
        setLiveConnected(false);
        if (wsRef.current === ws) {
          wsRef.current = null;
        }
      };
      ws.onerror = () => {
        setLiveConnected(false);
      };

      ws.onmessage = (event) => {
        try {
          const wire = JSON.parse(event.data) as MqttMonitorWireMessage;
          if (wire.type !== "message" || !wire.topic) return;

          const normalizedTopic = wire.topic.toUpperCase();
          if (
            normalizedTopic.includes(compactMac) &&
            normalizedTopic.includes("DEBUGMQTT")
          ) {
            const incomingItem: PrinterMqttLogItem = {
              id: Date.now(),
              recordedAt: wire.receivedAt ?? new Date().toISOString(),
              printerId,
              mac: compactMac,
              topic: wire.topic,
              payload: wire.payload ?? "",
            };

            setLogs((prev) => [incomingItem, ...prev].slice(0, 500));
            setTotal((prev) => prev + 1);
          }
        } catch {
          // Ignore unparseable wire frame
        }
      };
    } catch {
      // Ignore initial connection setup error
    }

    return () => {
      if (ws) {
        ws.onopen = null;
        ws.onclose = null;
        ws.onmessage = null;
        ws.onerror = null;
        ws.close();
      }
      if (wsRef.current === ws) {
        wsRef.current = null;
      }
    };
  }, [liveEnabled, compactMac, printerId]);

  const removeLogs = useCallback(
    async (params: DeletePrinterLogsParams) => {
      const res = await deletePrinterLogs(printerId, params);
      await loadLogs(0);
      setPage(0);
      return res;
    },
    [printerId, loadLogs],
  );

  return {
    logs,
    total,
    page,
    limit,
    loading,
    error,
    from,
    to,
    search,
    order,
    liveEnabled,
    liveConnected,
    setPage,
    setLimit,
    setFrom,
    setTo,
    setSearch,
    setOrder,
    setLiveEnabled,
    refetch: () => loadLogs(page),
    deleteLogs: removeLogs,
  };
}
