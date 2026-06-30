"use client";

import { useCallback, useState } from "react";
import { AnnualInspectionMqttPanel } from "@/components/mqtt/annual-inspection-mqtt-panel";
import { AnnualInspectionQrLookupPanel } from "@/components/mqtt/annual-inspection-qr-lookup-panel";
import { EnajenacionActivityPanel } from "@/components/mqtt/enajenacion-activity-panel";
import { EnajenacionTestPanel } from "@/components/mqtt/enajenacion-test-panel";
import { MqttDiagnosticsPanel } from "@/components/mqtt/mqtt-diagnostics-panel";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import { cn } from "@/lib/utils";

type MqttTab = "diagnostics" | "enajenacion" | "activity" | "annual-inspection" | "verify-qr";

const TAB_STORAGE_KEY = "remoto-workspace-tab";
const LEGACY_TAB_STORAGE_KEY = "mqtt-workspace-tab";

function readStoredTab(): MqttTab {
  if (typeof window === "undefined") {
    return "diagnostics";
  }
  const stored =
    sessionStorage.getItem(TAB_STORAGE_KEY) ??
    sessionStorage.getItem(LEGACY_TAB_STORAGE_KEY);
  if (stored === "monitor") {
    return "activity";
  }
  if (stored === "diagnostics" || stored === "enajenacion" || stored === "activity" || stored === "annual-inspection" || stored === "verify-qr") {
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
          ariaLabel="Sección Remoto"
          options={[
            { value: "diagnostics", label: "Diagnóstico" },
            { value: "activity", label: "Actividad" },
            { value: "enajenacion", label: "Enajenación" },
            { value: "annual-inspection", label: "Inspección anual" },
            { value: "verify-qr", label: "Verificar comprobante" },
          ]}
          className="w-full max-w-2xl"
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

      <div className={cn(tab !== "annual-inspection" && "hidden")}>
        <AnnualInspectionMqttPanel />
      </div>

      <div className={cn(tab !== "verify-qr" && "hidden")}>
        <AnnualInspectionQrLookupPanel />
      </div>
    </div>
  );
}
