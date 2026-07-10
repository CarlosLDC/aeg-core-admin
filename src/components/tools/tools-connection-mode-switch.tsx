"use client";

import { Cable, Wifi } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useToolsTransportContext,
} from "@/modules/tools/transport/tools-transport-provider";
import type { ToolsConnectionMode } from "@/modules/tools/transport/tools-printer-transport";

const MODES: { id: ToolsConnectionMode; label: string; icon: typeof Wifi }[] = [
  { id: "wifi", label: "WiFi / MQTT", icon: Wifi },
  { id: "usb", label: "USB", icon: Cable },
];

export function ToolsConnectionModeSwitch({ className }: { className?: string }) {
  const { mode, setMode, webSerialSupported } = useToolsTransportContext();

  return (
    <div
      className={cn(
        "inline-flex rounded-lg border border-border bg-card p-1",
        className,
      )}
      role="group"
      aria-label="Modo de conexión"
    >
      {MODES.map(({ id, label, icon: Icon }) => {
        const disabled = id === "usb" && !webSerialSupported;
        const active = mode === id;
        return (
          <button
            key={id}
            type="button"
            disabled={disabled}
            onClick={() => setMode(id)}
            className={cn(
              "inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              active
                ? "bg-foreground text-background shadow-sm"
                : "text-muted hover:bg-foreground/[0.04] hover:text-card-foreground",
              disabled && "cursor-not-allowed opacity-50",
            )}
            title={
              disabled
                ? "Web Serial no está disponible en este navegador. Use Chrome o Edge."
                : undefined
            }
          >
            <Icon className="size-4 shrink-0" aria-hidden />
            {label}
          </button>
        );
      })}
    </div>
  );
}
