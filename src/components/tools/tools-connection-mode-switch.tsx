"use client";

import { Cable, Wifi } from "lucide-react";
import {
  formFieldSegmentedToggleShellClass,
  segmentedToggleActiveClass,
} from "@/lib/toggle-button-styles";
import { cn } from "@/lib/utils";
import {
  useToolsTransportContext,
} from "@/modules/tools/transport/tools-transport-provider";
import type { ToolsConnectionMode } from "@/modules/tools/transport/tools-printer-transport";

const MODES: {
  id: ToolsConnectionMode;
  label: string;
  icon: typeof Wifi;
  tone: "sky" | "slate";
}[] = [
  { id: "wifi", label: "WiFi", icon: Wifi, tone: "sky" },
  { id: "usb", label: "USB", icon: Cable, tone: "slate" },
];

export function ToolsConnectionModeSwitch({ className }: { className?: string }) {
  const { mode, setMode, webSerialSupported } = useToolsTransportContext();

  return (
    <div className={cn("mx-auto w-full max-w-xs sm:max-w-sm", className)}>
      <div
        className={cn(formFieldSegmentedToggleShellClass, "grid grid-cols-2 gap-1")}
        role="group"
        aria-label="Modo de conexión"
      >
        {MODES.map(({ id, label, icon: Icon, tone }) => {
          const disabled = id === "usb" && !webSerialSupported;
          const active = mode === id;
          return (
            <button
              key={id}
              type="button"
              disabled={disabled}
              aria-pressed={active}
              onClick={() => setMode(id)}
              className={cn(
                "flex h-full min-w-0 items-center justify-center gap-2 rounded-md px-3 text-sm font-medium transition-all",
                active
                  ? segmentedToggleActiveClass(tone)
                  : "text-muted hover:text-foreground",
                disabled && "cursor-not-allowed opacity-50",
              )}
              title={
                disabled
                  ? "Web Serial no está disponible en este navegador. Use Chrome o Edge."
                  : id === "wifi"
                    ? "Operaciones remotas por WiFi / MQTT"
                    : "Operaciones por USB (Web Serial)"
              }
            >
              <Icon className="size-4 shrink-0" aria-hidden />
              <span>{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
