"use client";

import { useCallback, useEffect, useState } from "react";
import { EnajenacionTestPanel } from "@/components/mqtt/enajenacion-test-panel";
import { MqttDiagnosticsPanel } from "@/components/mqtt/mqtt-diagnostics-panel";
import { MqttMonitorPanel } from "@/components/mqtt/mqtt-monitor-panel";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import { useMqttMonitor } from "@/hooks/use-mqtt-monitor";
import { cn } from "@/lib/utils";

type MqttTab = "monitor" | "diagnostics" | "enajenacion";

const TAB_STORAGE_KEY = "mqtt-workspace-tab";

function readStoredTab(): MqttTab {
  if (typeof window === "undefined") {
    return "diagnostics";
  }
  const stored = sessionStorage.getItem(TAB_STORAGE_KEY);
  if (stored === "monitor" || stored === "diagnostics" || stored === "enajenacion") {
    return stored;
  }
  return "diagnostics";
}

export function MqttWorkspace() {
  const [tab, setTab] = useState<MqttTab>(readStoredTab);
  const monitor = useMqttMonitor();

  const handleTabChange = useCallback((next: MqttTab) => {
    setTab(next);
    sessionStorage.setItem(TAB_STORAGE_KEY, next);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-center">
        <SegmentedToggle
          value={tab}
          onChange={handleTabChange}
          ariaLabel="Sección MQTT"
          options={[
            { value: "diagnostics", label: "Diagnóstico" },
            { value: "monitor", label: "Monitor" },
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
        <EnajenacionTestPanel />
      </div>
    </div>
  );
}
