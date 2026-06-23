"use client";

import { useCallback, useState } from "react";
import { EnajenacionActivityPanel } from "@/components/mqtt/enajenacion-activity-panel";
import { EnajenacionTestPanel } from "@/components/mqtt/enajenacion-test-panel";
import { MqttDiagnosticsPanel } from "@/components/mqtt/mqtt-diagnostics-panel";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import { cn } from "@/lib/utils";

type MqttTab = "diagnostics" | "enajenacion" | "activity";

const TAB_STORAGE_KEY = "mqtt-workspace-tab";

function readStoredTab(): MqttTab {
  if (typeof window === "undefined") {
    return "diagnostics";
  }
  const stored = sessionStorage.getItem(TAB_STORAGE_KEY);
  if (stored === "monitor") {
    return "activity";
  }
  if (stored === "diagnostics" || stored === "enajenacion" || stored === "activity") {
    return stored;
  }
  return "diagnostics";
}

export function MqttWorkspace() {
  const [tab, setTab] = useState<MqttTab>(readStoredTab);

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
            { value: "activity", label: "Actividad" },
            { value: "enajenacion", label: "Enajenación" },
          ]}
          className="w-full max-w-lg"
        />
      </div>

      <div className={cn(tab !== "diagnostics" && "hidden")}>
        <MqttDiagnosticsPanel />
      </div>

      <div className={cn(tab !== "activity" && "hidden")}>
        <EnajenacionActivityPanel />
      </div>

      <div className={cn(tab !== "enajenacion" && "hidden")}>
        <EnajenacionTestPanel />
      </div>
    </div>
  );
}
