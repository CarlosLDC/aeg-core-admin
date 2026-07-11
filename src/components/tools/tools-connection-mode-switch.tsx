"use client";

import { Cable, Wifi } from "lucide-react";
import { ToolsActionButton } from "@/components/tools/tools-ui";
import { useToolsTransportContext } from "@/modules/tools/transport/tools-transport-provider";

export function ToolsConnectionModeToggle({
  className,
}: {
  className?: string;
}) {
  const { mode, setMode, webSerialSupported } = useToolsTransportContext();
  const isUsb = mode === "usb";
  const canSwitchToUsb = webSerialSupported;
  const disabled = !isUsb && !canSwitchToUsb;
  const actionLabel = isUsb ? "Cambiar a WiFi" : "Cambiar a USB";
  const disabledTitle =
    "Web Serial no está disponible en este navegador. Use Chrome o Edge.";

  return (
    <ToolsActionButton
      onClick={() => setMode(isUsb ? "wifi" : "usb")}
      disabled={disabled}
      title={disabled ? disabledTitle : actionLabel}
      aria-label={disabled ? disabledTitle : actionLabel}
      className={className}
    >
      {isUsb ? (
        <>
          <Wifi className="size-4 shrink-0" aria-hidden />
          WiFi
        </>
      ) : (
        <>
          <Cable className="size-4 shrink-0" aria-hidden />
          USB
        </>
      )}
    </ToolsActionButton>
  );
}
