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

function formatPayload(payload: unknown): string {
  return JSON.stringify(payload, null, 2);
}

export function ServerCommandBlock({
  serverCommand,
}: {
  serverCommand: MqttInboundMessage | null;
}) {
  if (!serverCommand) {
    return (
      <div className="mt-4 rounded-lg border border-dashed border-border bg-foreground/[0.02] px-3 py-3 text-sm text-muted">
        Esperando comando real de AEG Core en Comando…
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-2">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">
        Comando real del servidor (Comando)
      </p>
      <p className="font-mono text-xs break-all text-muted">{serverCommand.topic}</p>
      <pre className="max-h-64 overflow-auto rounded-lg border border-border bg-foreground/[0.03] p-4 font-mono text-xs text-card-foreground">
        {serverCommand.payload}
      </pre>
    </div>
  );
}

export function SimulatePrinterButton({
  stepId,
  simulation,
  disabled,
  disabledReason,
}: {
  stepId: string;
  simulation: PrinterSimulationPayload;
  disabled?: boolean;
  disabledReason?: string;
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
    } catch (err) {
      toast.error(getMqttErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-4 space-y-2">
      <button
        type="button"
        onClick={() => void handlePublish()}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground",
          "hover:bg-accent/90 disabled:pointer-events-none disabled:opacity-50",
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
      ) : (
        <details className="rounded-lg border border-border bg-foreground/[0.02] text-sm">
          <summary className="cursor-pointer px-3 py-2 text-xs text-muted">
            Ver payload que se publicará en CmdServer
          </summary>
          <pre className="max-h-48 overflow-auto border-t border-border px-3 py-2 font-mono text-xs text-card-foreground">
            {formatPayload(simulation.payload)}
          </pre>
        </details>
      )}
    </div>
  );
}
