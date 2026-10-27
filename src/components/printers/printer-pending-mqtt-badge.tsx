"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/context/toast-provider";
import { verifyAndSyncPrinterStatus } from "@/lib/printers-api";
import type { PrinterResponse } from "@/types/printer";

const PENDING_MQTT_TITLE =
  "Pendiente enajenación Remoto: ticket fiscal guardado; falta completar el ritual en la impresora. Haz clic para consultar a la impresora si ya está enajenada (StaInf).";

type PrinterPendingMqttBadgeProps = {
  className?: string;
  printer?: Pick<PrinterResponse, "id" | "fiscalSerial">;
  onVerified?: () => void;
};

export function PrinterPendingMqttBadge({
  className,
  printer,
  onVerified,
}: PrinterPendingMqttBadgeProps) {
  const toast = useToast();
  const [verifying, setVerifying] = useState(false);

  const handleClick = async (e: React.MouseEvent) => {
    if (!printer) return;
    e.stopPropagation();
    e.preventDefault();

    if (verifying) return;
    setVerifying(true);

    try {
      const res = await verifyAndSyncPrinterStatus(printer.id, true);
      if (res.synced) {
        toast.success(
          res.message ||
            `Impresora ${printer.fiscalSerial} sincronizada a Enajenada con éxito.`,
        );
        onVerified?.();
      } else if (res.alreadyEnajenada && res.match) {
        toast.success(res.message);
        onVerified?.();
      } else if (!res.match && res.reportedFiscalSerial) {
        toast.error(res.message);
      } else {
        toast.error(res.message);
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "No se pudo verificar el estatus con la impresora.";
      toast.error(message);
    } finally {
      setVerifying(false);
    }
  };

  if (verifying) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 text-xs font-normal text-amber-600 dark:text-amber-400",
          className,
        )}
        title="Consultando estatus de registro fiscal en la impresora (StaInf)..."
      >
        <Loader2 className="size-3 animate-spin text-amber-500" />
        <span className="text-[11px]">Verificando...</span>
      </span>
    );
  }

  if (printer) {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          "group inline-flex items-center gap-1 rounded px-1 py-0.5 transition-colors hover:bg-amber-500/10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-400",
          className,
        )}
        title={PENDING_MQTT_TITLE}
        aria-label={PENDING_MQTT_TITLE}
      >
        <span
          className="inline-flex size-2 shrink-0 rounded-full bg-amber-400 shadow-[0_0_0_2px] shadow-amber-400/25 animate-pulse group-hover:bg-amber-500"
          role="status"
        />
        <span className="hidden text-[10px] text-amber-700 underline-offset-2 hover:underline group-hover:inline dark:text-amber-300">
          ¿Ya enajenada?
        </span>
      </button>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex size-2 shrink-0 rounded-full bg-amber-400 shadow-[0_0_0_2px] shadow-amber-400/25 animate-pulse",
        className,
      )}
      title={PENDING_MQTT_TITLE}
      aria-label={PENDING_MQTT_TITLE}
      role="status"
    />
  );
}
