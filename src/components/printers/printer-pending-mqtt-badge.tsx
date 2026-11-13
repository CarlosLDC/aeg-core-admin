"use client";

import { useState } from "react";
import { Loader2, RotateCw } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/context/toast-provider";
import { getToolsMqttErrorMessage, rebootToolsPrinter } from "@/lib/tools-mqtt-api";
import { cn } from "@/lib/utils";
import type { PrinterResponse } from "@/types/printer";

const PENDING_MQTT_TITLE =
  "Pendiente enajenación Remoto: ticket fiscal guardado; falta completar el ritual en la impresora.";

type PrinterPendingMqttBadgeProps = {
  className?: string;
  printer?: Pick<PrinterResponse, "id" | "fiscalSerial" | "macAddress">;
};

export function PrinterPendingMqttBadge({
  className,
  printer,
}: PrinterPendingMqttBadgeProps) {
  const toast = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const hasMac = Boolean(printer?.macAddress?.trim());

  const handleConfirmReboot = async () => {
    if (!printer) return;
    setSubmitting(true);
    try {
      const result = await rebootToolsPrinter(printer.id);
      if (result.success) {
        toast.success(
          result.message ?? "Comando de reinicio enviado a la impresora.",
        );
        setConfirmOpen(false);
      } else {
        toast.error(result.message ?? "No se pudo reiniciar la impresora.");
      }
    } catch (err) {
      toast.error(getToolsMqttErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <span
        className={cn(
          "inline-flex size-2 shrink-0 rounded-full bg-amber-400 shadow-[0_0_0_2px] shadow-amber-400/25 animate-pulse",
          className,
        )}
        title={PENDING_MQTT_TITLE}
        aria-label={PENDING_MQTT_TITLE}
        role="status"
      />
      {printer ? (
        <button
          type="button"
          disabled={!hasMac || submitting}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            if (hasMac && !submitting) {
              setConfirmOpen(true);
            }
          }}
          title={
            hasMac
              ? "Reiniciar impresora para reintentar enajenación Remoto"
              : "La impresora no tiene dirección MAC registrada"
          }
          aria-label="Reiniciar impresora"
          className={cn(
            "inline-flex items-center gap-1 rounded-md border border-accent/35 bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
            hasMac && !submitting
              ? "cursor-pointer hover:bg-accent/20"
              : "cursor-not-allowed opacity-50",
          )}
        >
          {submitting ? (
            <Loader2 className="size-3 shrink-0 animate-spin" aria-hidden />
          ) : (
            <RotateCw className="size-3 shrink-0 opacity-80" aria-hidden />
          )}
          Reiniciar
        </button>
      ) : null}

      {printer ? (
        <span onClick={(e) => e.stopPropagation()}>
          <ConfirmDialog
            open={confirmOpen}
            title="¿Reiniciar impresora fiscal?"
            message={`Se enviará la instrucción de reinicio al equipo ${printer.fiscalSerial} (comando resetMF) para que vuelva a intentar la enajenación Remoto al encender.`}
            confirmLabel="Reiniciar"
            cancelLabel="Cancelar"
            destructive
            loading={submitting}
            onConfirm={() => void handleConfirmReboot()}
            onCancel={() => {
              if (!submitting) {
                setConfirmOpen(false);
              }
            }}
          />
        </span>
      ) : null}
    </>
  );
}
