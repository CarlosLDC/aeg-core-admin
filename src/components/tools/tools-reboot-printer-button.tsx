"use client";

import { useState } from "react";
import { RotateCw } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ToolsActionButton } from "@/components/tools/tools-ui";
import { useToolsTransport } from "@/modules/tools/transport/tools-transport-provider";
import { getToolsMqttErrorMessage } from "@/lib/tools-mqtt-api";
import { useToast } from "@/context/toast-provider";
import { cn } from "@/lib/utils";

type ToolsRebootPrinterButtonProps = {
  disabled?: boolean;
  onRebootSent?: () => void | Promise<void>;
  className?: string;
  label?: string;
};

export function ToolsRebootPrinterButton({
  disabled = false,
  onRebootSent,
  className,
  label = "Reiniciar",
}: ToolsRebootPrinterButtonProps) {
  const transport = useToolsTransport();
  const toast = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      const result = await transport.rebootPrinter();
      if (result.success) {
        toast.success(result.message ?? "Comando de reinicio enviado a la impresora.");
        setConfirmOpen(false);
        if (onRebootSent) {
          void onRebootSent();
        }
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
      <ToolsActionButton
        loading={submitting}
        disabled={disabled || submitting}
        onClick={() => setConfirmOpen(true)}
        className={cn("w-auto", className)}
        title="Enviar comando de reinicio a la impresora"
        aria-label="Reiniciar impresora"
      >
        {!submitting ? <RotateCw className="size-4 shrink-0" aria-hidden /> : null}
        {label}
      </ToolsActionButton>

      <ConfirmDialog
        open={confirmOpen}
        title="¿Reiniciar impresora fiscal?"
        message="Se enviará la instrucción de reinicio al equipo (comando resetMF). La impresora reiniciará su módulo fiscal y se restablecerá la conexión en unos momentos."
        confirmLabel="Reiniciar"
        cancelLabel="Cancelar"
        destructive
        loading={submitting}
        onConfirm={() => void handleConfirm()}
        onCancel={() => {
          if (!submitting) {
            setConfirmOpen(false);
          }
        }}
      />
    </>
  );
}
