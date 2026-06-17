"use client";

import { useState, type MouseEvent } from "react";
import { Check, Copy, Loader2, Send } from "lucide-react";
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

function CopyTextButton({
  text,
  label,
}: {
  text: string;
  label: string;
}) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  async function handleCopy(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success(`${label} copiado`);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("No se pudo copiar al portapapeles");
    }
  }

  return (
    <button
      type="button"
      onClick={(event) => void handleCopy(event)}
      disabled={!text.trim()}
      className="inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-xs font-medium text-muted hover:bg-foreground/5 disabled:pointer-events-none disabled:opacity-50"
    >
      {copied ? (
        <Check className="size-3.5" aria-hidden />
      ) : (
        <Copy className="size-3.5" aria-hidden />
      )}
      Copiar
    </button>
  );
}

export function EnajenacionStepDetails({
  label,
  copyText,
  copyLabel,
  emptyMessage,
}: {
  label: string;
  copyText: string;
  copyLabel: string;
  emptyMessage?: string;
}) {
  const hasContent = copyText.trim().length > 0;

  return (
    <details className="rounded-lg border border-border bg-foreground/[0.02] text-sm">
      <summary className="cursor-pointer px-3 py-2 text-xs text-muted">
        {label}
      </summary>
      <div className="border-t border-border">
        <div className="flex justify-end px-3 pt-2">
          <CopyTextButton text={copyText} label={copyLabel} />
        </div>
        {hasContent ? (
          <pre className="max-h-48 overflow-auto px-3 pb-2 font-mono text-xs text-card-foreground">
            {copyText}
          </pre>
        ) : (
          <p className="px-3 pb-3 text-sm text-muted">
            {emptyMessage ?? "Sin contenido disponible."}
          </p>
        )}
      </div>
    </details>
  );
}

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
