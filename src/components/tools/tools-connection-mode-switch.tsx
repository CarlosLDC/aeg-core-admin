"use client";

import { Cable, Wifi } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useToolsTransportContext,
} from "@/modules/tools/transport/tools-transport-provider";

export function ToolsConnectionModeToggle({
  className,
}: {
  className?: string;
}) {
  const { mode, setMode, webSerialSupported } = useToolsTransportContext();
  const isUsb = mode === "usb";
  const canSwitchToUsb = webSerialSupported;
  const disabled = !isUsb && !canSwitchToUsb;
  const label = isUsb ? "Cambiar a WiFi" : "Cambiar a USB";
  const disabledTitle =
    "Web Serial no está disponible en este navegador. Use Chrome o Edge.";

  return (
    <button
      type="button"
      onClick={() => setMode(isUsb ? "wifi" : "usb")}
      disabled={disabled}
      title={disabled ? disabledTitle : label}
      aria-label={disabled ? disabledTitle : label}
      className={cn(
        "rounded-lg border border-border bg-card p-2 text-muted transition-colors hover:bg-foreground/5 hover:text-foreground",
        disabled && "cursor-not-allowed opacity-50 hover:bg-card hover:text-muted",
        className,
      )}
    >
      {isUsb ? (
        <Wifi className="size-4" aria-hidden />
      ) : (
        <Cable className="size-4" aria-hidden />
      )}
    </button>
  );
}
