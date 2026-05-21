"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getMqttMonitorStatus,
  getMqttRecentMessages,
  getMqttSubscription,
  getMqttWebSocketUrl,
  updateMqttSubscription,
} from "@/lib/mqtt-api";
import type {
  MqttInboundMessage,
  MqttMonitorStatus,
  MqttMonitorWireMessage,
} from "@/types/mqtt";

const MAX_MESSAGES = 500;

export type MqttWsStatus = "closed" | "connecting" | "open";

function wireToInbound(msg: MqttMonitorWireMessage): MqttInboundMessage | null {
  if (msg.type !== "message" || !msg.topic || msg.receivedAt === undefined) {
    return null;
  }
  return {
    topic: msg.topic,
    payload: msg.payload ?? "",
    receivedAt: msg.receivedAt,
    qos: msg.qos ?? null,
  };
}

export function useMqttMonitor() {
  const [monitorTopic, setMonitorTopic] = useState("aeg/test/#");
  const [messages, setMessages] = useState<MqttInboundMessage[]>([]);
  const [wsStatus, setWsStatus] = useState<MqttWsStatus>("closed");
  const [monitorStatus, setMonitorStatus] = useState<MqttMonitorStatus | null>(
    null,
  );
  const [subscriptionActive, setSubscriptionActive] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [subscribeLoading, setSubscribeLoading] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);

  const disconnectWebSocket = useCallback(() => {
    const ws = wsRef.current;
    if (ws) {
      ws.onopen = null;
      ws.onclose = null;
      ws.onmessage = null;
      ws.onerror = null;
      ws.close();
      wsRef.current = null;
    }
    setWsStatus("closed");
  }, []);

  const connectWebSocket = useCallback(() => {
    disconnectWebSocket();
    setWsStatus("connecting");
    try {
      const ws = new WebSocket(getMqttWebSocketUrl());
      wsRef.current = ws;

      ws.onopen = () => setWsStatus("open");
      ws.onclose = () => {
        if (wsRef.current === ws) {
          setWsStatus("closed");
          wsRef.current = null;
        }
      };
      ws.onerror = () => {
        if (wsRef.current === ws) {
          setWsStatus("closed");
        }
      };
      ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data as string) as MqttMonitorWireMessage;
          if (parsed.type === "subscription" && parsed.topic) {
            setMonitorTopic(parsed.topic);
            setMessages([]);
            return;
          }
          const inbound = wireToInbound(parsed);
          if (inbound) {
            setMessages((prev) => [inbound, ...prev].slice(0, MAX_MESSAGES));
          }
        } catch {
          // ignore malformed frames
        }
      };
    } catch {
      setWsStatus("closed");
    }
  }, [disconnectWebSocket]);

  const refreshMonitor = useCallback(async () => {
    const [status, subscription, history] = await Promise.all([
      getMqttMonitorStatus(),
      getMqttSubscription(),
      getMqttRecentMessages(50),
    ]);
    setMonitorStatus(status);
    setMonitorTopic(subscription.topic);
    setSubscriptionActive(subscription.active);
    setMessages(history);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await refreshMonitor();
      } catch {
        if (!cancelled) {
          setMonitorStatus(null);
        }
      } finally {
        if (!cancelled) {
          setInitialLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
      disconnectWebSocket();
    };
  }, [disconnectWebSocket, refreshMonitor]);

  const subscribeToTopic = useCallback(
    async (topic: string) => {
      const trimmed = topic.trim();
      if (!trimmed) {
        throw new Error("El tópico es obligatorio.");
      }
      setSubscribeLoading(true);
      try {
        const result = await updateMqttSubscription(trimmed);
        setMonitorTopic(result.topic);
        setSubscriptionActive(result.active);
        setMessages([]);
        connectWebSocket();
        const status = await getMqttMonitorStatus();
        setMonitorStatus(status);
      } finally {
        setSubscribeLoading(false);
      }
    },
    [connectWebSocket],
  );

  const clearMessages = useCallback(() => setMessages([]), []);

  return {
    monitorTopic,
    setMonitorTopic,
    messages,
    wsStatus,
    monitorStatus,
    subscriptionActive,
    initialLoading,
    subscribeLoading,
    subscribeToTopic,
    connectWebSocket,
    disconnectWebSocket,
    refreshMonitor,
    clearMessages,
  };
}
