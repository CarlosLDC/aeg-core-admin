"use client";

import { Cable, Loader2, Unplug } from "lucide-react";
import { ToolsActionButton, toolsPanelSectionClass } from "@/components/tools/tools-ui";
import { cn } from "@/lib/utils";
import { getToolsUsbErrorMessage } from "@/modules/tools/serial/tools-serial-port";
import { useToolsTransportContext } from "@/modules/tools/transport/tools-transport-provider";
import { useToast } from "@/context/toast-provider";

export function ToolsUsbConnectPanel({ className }: { className?: string }) {
  const toast = useToast();
  const {
    mode,
    usbConnected,
    usbConnecting,
    usbError,
    webSerialSupported,
    connectUsb,
    disconnectUsb,
  } = useToolsTransportContext();

  if (mode !== "usb") {
    return null;
  }

  if (!webSerialSupported) {
    return (
      <div
        className={cn(
          toolsPanelSectionClass,
          "border-amber-500/20 bg-amber-500/10 text-sm text-amber-800 dark:text-amber-200",
          className,
        )}
      >
        Web Serial no está disponible en este navegador. Para conexión USB use Chrome o
        Edge en un contexto seguro (HTTPS o localhost).
      </div>
    );
  }

  const handleConnect = async () => {
    try {
      await connectUsb();
      toast.success("Impresora conectada por USB.");
    } catch (error) {
      toast.error(getToolsUsbErrorMessage(error));
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnectUsb();
      toast.success("Conexión USB cerrada.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo cerrar la conexión USB.",
      );
    }
  };

  return (
    <div className={cn(toolsPanelSectionClass, "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between", className)}>
      <div className="flex min-w-0 items-start gap-3">
        <Cable className="mt-0.5 size-5 shrink-0 text-sky-600 dark:text-sky-400" aria-hidden />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-card-foreground">Conexión USB</p>
          <p className="mt-1 text-sm text-muted">
            {usbConnected
              ? "Puerto serial abierto. Las operaciones se envían directamente a la impresora."
              : "Conecte el cable USB y seleccione el puerto serial de la impresora."}
          </p>
          {usbError ? (
            <p className="mt-2 text-sm text-rose-600 dark:text-rose-400">{usbError}</p>
          ) : null}
        </div>
      </div>
      <div className="flex shrink-0 gap-2">
        {usbConnected ? (
          <ToolsActionButton
            loading={usbConnecting}
            onClick={() => void handleDisconnect()}
          >
            <Unplug className="mr-2 size-4" aria-hidden />
            Desconectar
          </ToolsActionButton>
        ) : (
          <ToolsActionButton
            variant="primary"
            loading={usbConnecting}
            onClick={() => void handleConnect()}
          >
            {usbConnecting ? (
              <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
            ) : (
              <Cable className="mr-2 size-4" aria-hidden />
            )}
            Conectar USB
          </ToolsActionButton>
        )}
      </div>
    </div>
  );
}
