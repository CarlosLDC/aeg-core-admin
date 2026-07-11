"use client";

import { Cable } from "lucide-react";
import { ToolsActionButton } from "@/components/tools/tools-ui";
import { useToolsTransportContext } from "@/modules/tools/transport/tools-transport-provider";
import { useToast } from "@/context/toast-provider";

export function ToolsUsbConnectionButton({
  className,
}: {
  className?: string;
}) {
  const toast = useToast();
  const {
    usbConnected,
    usbConnecting,
    webSerialSupported,
    connectUsb,
    disconnectUsb,
  } = useToolsTransportContext();
  const disabledTitle =
    "Web Serial no está disponible en este navegador. Use Chrome o Edge.";

  const handleClick = async () => {
    if (usbConnected) {
      try {
        await disconnectUsb();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "No se pudo cerrar la conexión USB.",
        );
      }
      return;
    }

    try {
      await connectUsb();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo conectar por USB.",
      );
    }
  };

  return (
    <ToolsActionButton
      variant={usbConnected ? "primary" : "default"}
      aria-pressed={usbConnected}
      loading={usbConnecting}
      onClick={() => void handleClick()}
      disabled={!webSerialSupported && !usbConnected}
      title={!webSerialSupported && !usbConnected ? disabledTitle : undefined}
      aria-label={
        usbConnected
          ? "Desactivar conexión USB"
          : "Activar conexión USB"
      }
      className={className}
    >
      <Cable className="size-4 shrink-0" aria-hidden />
      USB
    </ToolsActionButton>
  );
}
