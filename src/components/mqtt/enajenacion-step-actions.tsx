"use client";

import { useState } from "react";
import { Loader2, Send } from "lucide-react";
import { useToast } from "@/context/toast-provider";
import { getMqttErrorMessage, publishMqttMessage } from "@/lib/mqtt-api";
import {
  printerSimulationButtonLabel,
  type PrinterSimulationPayload,
} from "@/lib/enajenacion-mqtt-protocol";
import type { MqttInboundMessage, MqttPublishPayload } from "@/types/mqtt";
import { cn } from "@/lib/utils";

export function ServerCommandBlock({
  serverCommand,
}: {
  serverCommand: MqttInboundMessage | null;
}) {
  if (!serverCommand) {
    return (
      <p className="text-sm text-muted">
        Aún no hay comando en Comando para este paso.
      </p>
    );
  }

  return (
    <pre className="max-h-48 overflow-auto rounded-lg border border-border bg-foreground/[0.03] p-3 font-mono text-xs text-card-foreground">
      {serverCommand.payload}
    </pre>
  );
}

export function SimulatePrinterButton({
  stepId,
  simulation,
  disabled,
  disabledReason,
  onPublished,
  fullWidth,
}: {
  stepId: string;
  simulation: PrinterSimulationPayload;
  disabled?: boolean;
  disabledReason?: string;
  onPublished?: (stepId: string) => void;
  fullWidth?: boolean;
}) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  async function handlePublish() {
    setLoading(true);
    try {
      await publishMqttMessage({
        topic: simulation.topic,
        payload: simulation.payload as MqttPublishPayload,
      });
      toast.success(
        stepId === "request"
          ? "ptrEnajenar publicado en CmdServer"
          : "Respuesta simulada publicada en CmdServer",
      );
      onPublished?.(stepId);
    } catch (err) {
      toast.error(getMqttErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => void handlePublish()}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-foreground",
          "hover:bg-accent/90 disabled:pointer-events-none disabled:opacity-50",
          fullWidth && "w-full",
        )}
      >
        {loading ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : (
          <Send className="size-4" aria-hidden />
        )}
        {printerSimulationButtonLabel(stepId)}
      </button>
      {disabled && disabledReason ? (
        <p className="text-xs text-muted">{disabledReason}</p>
      ) : null}
    </div>
  );
}
