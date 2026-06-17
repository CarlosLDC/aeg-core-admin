"use client";

import { useState } from "react";
import { EnajenacionTestPanel } from "@/components/mqtt/enajenacion-test-panel";
import { MqttDiagnosticsPanel } from "@/components/mqtt/mqtt-diagnostics-panel";
import { MqttMonitorPanel } from "@/components/mqtt/mqtt-monitor-panel";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import { useMqttMonitor } from "@/hooks/use-mqtt-monitor";
import { cn } from "@/lib/utils";

type MqttTab = "monitor" | "diagnostics" | "enajenacion";

export function MqttWorkspace() {
  const [tab, setTab] = useState<MqttTab>("monitor");
  const monitor = useMqttMonitor();

  return (
    <div className="space-y-6">
      <div className="flex justify-center">
        <SegmentedToggle
          value={tab}
          onChange={setTab}
          ariaLabel="Sección MQTT"
          options={[
            { value: "monitor", label: "Monitor" },
            { value: "diagnostics", label: "Diagnóstico" },
            { value: "enajenacion", label: "Enajenación" },
          ]}
          className="w-full max-w-md"
        />
      </div>

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
        />
      </div>
    </div>
  );
}
