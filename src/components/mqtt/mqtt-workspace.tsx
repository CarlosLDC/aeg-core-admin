"use client";

import { useCallback, useState } from "react";
import { AnnualInspectionQrLookupPanel } from "@/components/mqtt/annual-inspection-qr-lookup-panel";
import { EnajenacionActivityPanel } from "@/components/mqtt/enajenacion-activity-panel";
import { FiscalizacionTestPanel } from "@/components/mqtt/fiscalizacion-test-panel";
import { MqttDiagnosticsPanel } from "@/components/mqtt/mqtt-diagnostics-panel";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import { cn } from "@/lib/utils";

/**
 * Full Remoto tab set. Enajenación and Inspección anual stay in the type union /
 * storage migration but are omitted from {@link VISIBLE_TAB_OPTIONS} for now.
 * Restore by re-adding those options and mounting their panels again
 * (`EnajenacionTestPanel`, `AnnualInspectionMqttPanel`).
 */
type MqttTab =
  | "diagnostics"
  | "enajenacion"
  | "fiscalizacion"
  | "activity"
  | "annual-inspection"
  | "verify-qr";

const HIDDEN_TABS = new Set<MqttTab>(["enajenacion", "annual-inspection"]);

const VISIBLE_TAB_OPTIONS: { value: MqttTab; label: string }[] = [
  { value: "diagnostics", label: "Diagnóstico" },
  { value: "activity", label: "Actividad" },
  { value: "fiscalizacion", label: "Fiscalización" },
  { value: "verify-qr", label: "Comprobante" },
];

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
  if (
    stored === "diagnostics" ||
    stored === "enajenacion" ||
    stored === "fiscalizacion" ||
    stored === "activity" ||
    stored === "annual-inspection" ||
    stored === "verify-qr"
  ) {
    if (HIDDEN_TABS.has(stored)) {
      return "diagnostics";
    }
    return stored;
  }
  return "diagnostics";
}

export function MqttWorkspace() {
  const [tab, setTab] = useState<MqttTab>(readStoredTab);

  const handleTabChange = useCallback((next: MqttTab) => {
    if (HIDDEN_TABS.has(next)) {
      return;
    }
    setTab(next);
    sessionStorage.setItem(TAB_STORAGE_KEY, next);
  }, []);

  return (
    <div className="admin-content-stack">
      <div className="flex justify-center">
        <SegmentedToggle
          value={tab}
          onChange={handleTabChange}
          ariaLabel="Sección Remoto"
          options={VISIBLE_TAB_OPTIONS}
          className="w-full max-w-2xl"
        />
      </div>

      <div className={cn(tab !== "diagnostics" && "hidden")}>
        <MqttDiagnosticsPanel />
      </div>

      <div className={cn(tab !== "activity" && "hidden")}>
        <EnajenacionActivityPanel />
      </div>

      <div className={cn(tab !== "fiscalizacion" && "hidden")}>
        <FiscalizacionTestPanel />
      </div>

      <div className={cn(tab !== "verify-qr" && "hidden")}>
        <AnnualInspectionQrLookupPanel />
      </div>
    </div>
  );
}
