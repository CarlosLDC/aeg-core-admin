"use client";

import { useState } from "react";
import { Activity } from "lucide-react";
import { EnajenacionTestPanel } from "@/components/mqtt/enajenacion-test-panel";
import { MqttDiagnosticsPanel } from "@/components/mqtt/mqtt-diagnostics-panel";
import { MqttMonitorPanel } from "@/components/mqtt/mqtt-monitor-panel";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import { useMqttMonitor } from "@/hooks/use-mqtt-monitor";
import { cn } from "@/lib/utils";

type MqttTab = "monitor" | "diagnostics" | "enajenacion";

const TAB_HELP: Record<MqttTab, string> = {
  monitor:
    "Escucha tráfico MQTT en tiempo real. Suscríbete a un tópico y conecta el WebSocket para ver mensajes entrantes.",
  diagnostics:
    "Comprueba la conectividad con el broker y publica mensajes de prueba sin depender del flujo fiscal.",
  enajenacion:
    "Simula el ritual de enajenación fiscal (ptrEnajenar → Reporte Z). Abre la documentación del protocolo en una pestaña nueva desde el panel de prueba.",
};

function MqttStatusStrip({
  monitorTopic,
  wsStatus,
  messageCount,
  onOpenMonitor,
}: {
  monitorTopic: string;
  wsStatus: "closed" | "connecting" | "open";
  messageCount: number;
  onOpenMonitor: () => void;
}) {
  const wsLabel =
    wsStatus === "open"
      ? "WebSocket activo"
      : wsStatus === "connecting"
        ? "Conectando…"
        : "WebSocket inactivo";

  const wsTone =
    wsStatus === "open"
      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
      : wsStatus === "connecting"
        ? "bg-amber-500/10 text-amber-800 dark:text-amber-200"
        : "bg-foreground/5 text-muted";

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm shadow-sm">
      <Activity className="size-4 shrink-0 text-accent" aria-hidden />
      <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", wsTone)}>
        {wsLabel}
      </span>
      <span className="text-muted">
        Tópico:{" "}
        <code className="font-mono text-xs text-card-foreground">
          {monitorTopic.trim() || "—"}
        </code>
      </span>
      <span className="text-muted">
        {messageCount} mensaje{messageCount === 1 ? "" : "s"} en buffer
      </span>
      <button
        type="button"
        onClick={onOpenMonitor}
        className="ml-auto text-xs font-medium text-accent hover:underline"
      >
        Ir al monitor
      </button>
    </div>
  );
}

export function MqttWorkspace() {
  const [tab, setTab] = useState<MqttTab>("monitor");
  const monitor = useMqttMonitor();

  return (
    <div className="space-y-6">
      <SegmentedToggle
        value={tab}
        onChange={setTab}
        ariaLabel="Sección MQTT"
        options={[
          { value: "monitor", label: "Monitor" },
          { value: "diagnostics", label: "Diagnóstico" },
          { value: "enajenacion", label: "Enajenación" },
        ]}
        className="max-w-2xl"
      />

      <p className="text-sm text-muted">{TAB_HELP[tab]}</p>

      {tab !== "monitor" && (
        <MqttStatusStrip
          monitorTopic={monitor.monitorTopic}
          wsStatus={monitor.wsStatus}
          messageCount={monitor.messages.length}
          onOpenMonitor={() => setTab("monitor")}
        />
      )}

      <div className={cn(tab !== "monitor" && "hidden")}>
        <MqttMonitorPanel monitor={monitor} />
      </div>

      <div className={cn(tab !== "diagnostics" && "hidden")}>
        <MqttDiagnosticsPanel />
      </div>

      <div className={cn(tab !== "enajenacion" && "hidden")}>
        <EnajenacionTestPanel
          liveMessages={monitor.messages}
          onApplyMonitorTopic={monitor.subscribeToTopic}
          onOpenMonitor={() => setTab("monitor")}
        />
      </div>
    </div>
  );
}
