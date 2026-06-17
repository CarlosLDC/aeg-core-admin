"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import {
  formatEnajenacionPayloadForCopy,
  type EnajenacionMqttCopyBlock,
  type EnajenacionStepCopyContent,
} from "@/lib/enajenacion-mqtt-protocol";
import { cn } from "@/lib/utils";

function CopyButton({
  label,
  text,
}: {
  label: string;
  text: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleCopy()}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium",
        "hover:bg-foreground/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30",
      )}
    >
      {copied ? (
        <Check className="size-3.5 text-emerald-600" aria-hidden />
      ) : (
        <Copy className="size-3.5" aria-hidden />
      )}
      {copied ? "Copiado" : label}
    </button>
  );
}

function MqttCopyBlock({ block }: { block: EnajenacionMqttCopyBlock }) {
  const payloadText = formatEnajenacionPayloadForCopy(block.payload);

  return (
    <div className="space-y-2 rounded-lg border border-border bg-foreground/[0.02] p-3">
      <div>
        <p className="text-sm font-medium text-card-foreground">{block.heading}</p>
        <p className="text-xs text-muted">{block.detail}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <CopyButton label="Copiar tópico" text={block.topic} />
        <CopyButton label="Copiar payload" text={payloadText} />
      </div>
      <div className="space-y-1.5">
        <p className="text-xs font-medium text-muted">Tópico</p>
        <pre className="overflow-x-auto rounded-md border border-border bg-background px-3 py-2 font-mono text-xs text-card-foreground">
          {block.topic}
        </pre>
        <p className="text-xs font-medium text-muted">Payload</p>
        <pre className="max-h-56 overflow-auto rounded-md border border-border bg-background px-3 py-2 font-mono text-xs text-card-foreground">
          {payloadText}
        </pre>
      </div>
    </div>
  );
}

export function EnajenacionStepCopyBlocks({
  content,
}: {
  content: EnajenacionStepCopyContent;
}) {
  return (
    <div className="mt-4 space-y-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">
        Copiar para MQTTX
      </p>
      <MqttCopyBlock block={content.publish} />
      <MqttCopyBlock block={content.expectedResponse} />
    </div>
  );
}
