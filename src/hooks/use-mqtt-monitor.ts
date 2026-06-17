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

export type MqttLiveStatus = "idle" | "syncing" | "live";

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
  const [liveStatus, setLiveStatus] = useState<MqttLiveStatus>("idle");
  const [monitorStatus, setMonitorStatus] = useState<MqttMonitorStatus | null>(
    null,
  );
  const [subscriptionActive, setSubscriptionActive] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [subscribeLoading, setSubscribeLoading] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);

  const stopLiveStream = useCallback(() => {
    const ws = wsRef.current;
    if (ws) {
      ws.onopen = null;
      ws.onclose = null;
      ws.onmessage = null;
      ws.onerror = null;
      ws.close();
      wsRef.current = null;
    }
    setLiveStatus("idle");
  }, []);

  const startLiveStream = useCallback(() => {
    stopLiveStream();
    setLiveStatus("syncing");
    try {
      const ws = new WebSocket(getMqttWebSocketUrl());
      wsRef.current = ws;

      ws.onopen = () => setLiveStatus("live");
      ws.onclose = () => {
        if (wsRef.current === ws) {
          setLiveStatus("idle");
          wsRef.current = null;
        }
      };
      ws.onerror = () => {
        if (wsRef.current === ws) {
          setLiveStatus("idle");
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
      setLiveStatus("idle");
    }
  }, [stopLiveStream]);

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
    if (subscription.active && wsRef.current?.readyState !== WebSocket.OPEN) {
      startLiveStream();
    }
    return subscription;
  }, [startLiveStream]);

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
      stopLiveStream();
    };
  }, [stopLiveStream, refreshMonitor]);

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
        startLiveStream();
        const status = await getMqttMonitorStatus();
        setMonitorStatus(status);
      } finally {
        setSubscribeLoading(false);
      }
    },
    [startLiveStream],
  );

  const clearMessages = useCallback(() => setMessages([]), []);

  return {
    monitorTopic,
    setMonitorTopic,
    messages,
    liveStatus,
    monitorStatus,
    subscriptionActive,
    initialLoading,
    subscribeLoading,
    subscribeToTopic,
    refreshMonitor,
    clearMessages,
  };
}
