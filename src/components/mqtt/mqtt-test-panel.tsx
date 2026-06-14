"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Radio, Send, Wifi } from "lucide-react";
import { useToast } from "@/context/toast-provider";
import { EnajenacionTestPanel } from "@/components/mqtt/enajenacion-test-panel";
import { MqttMonitorPanel } from "@/components/mqtt/mqtt-monitor-panel";
import { useMqttMonitor } from "@/hooks/use-mqtt-monitor";
import {
  checkMqttConnection,
  getMqttErrorMessage,
  publishMqttMessage,
  sendMqttTestMessage,
} from "@/lib/mqtt-api";
import type {
  MqttConnectionProbeResult,
  MqttPublishPayload,
  MqttPublishResponse,
  MqttTestMessageResponse,
} from "@/types/mqtt";
import { formatJsonText } from "@/lib/format-json-paste";
import { cn } from "@/lib/utils";

const DEFAULT_TOPIC = "aeg/test/manual";
const DEFAULT_PAYLOAD = `{
  "message": "mensaje de prueba",
  "priority": 1,
  "tags": ["mqtt", "admin"]
}`;

function JsonBlock({
  title,
  status,
  children,
}: {
  title: string;
  status?: "ok" | "error" | "neutral";
  children: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium text-card-foreground">{title}</h3>
        {status && (
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-xs font-medium",
              status === "ok" &&
                "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
              status === "error" &&
                "bg-rose-500/10 text-rose-700 dark:text-rose-300",
              status === "neutral" && "bg-foreground/5 text-muted",
            )}
          >
            {status === "ok"
              ? "Éxito"
              : status === "error"
                ? "Error"
                : "Respuesta"}
          </span>
        )}
      </div>
      <pre className="max-h-64 overflow-auto rounded-lg border border-border bg-foreground/[0.03] p-4 font-mono text-xs text-card-foreground">
        {children}
      </pre>
    </div>
  );
}

export function MqttTestPanel() {
  const toast = useToast();
  const monitor = useMqttMonitor();
  const [probeLoading, setProbeLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [publishLoading, setPublishLoading] = useState(false);
  const [probeResult, setProbeResult] = useState<{
    result: MqttConnectionProbeResult;
    httpStatus: number;
  } | null>(null);
  const [testResult, setTestResult] = useState<MqttTestMessageResponse | null>(
    null,
  );
  const [publishResult, setPublishResult] = useState<{
    response: MqttPublishResponse;
    httpStatus: number;
  } | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);

  const [topic, setTopic] = useState(DEFAULT_TOPIC);
  const [payloadText, setPayloadText] = useState(DEFAULT_PAYLOAD);
  const payloadTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  const inputClass =
    "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-ring/20";

  function syncPayloadTextareaHeight(textarea: HTMLTextAreaElement) {
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }

  useEffect(() => {
    if (!payloadTextareaRef.current) return;
    syncPayloadTextareaHeight(payloadTextareaRef.current);
  }, [payloadText]);

  function handlePayloadPaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const pasted = e.clipboardData.getData("text/plain");
    const formatted = formatJsonText(pasted);
    if (formatted == null) return;

    e.preventDefault();
    const { selectionStart, selectionEnd } = e.currentTarget;
    const next =
      payloadText.slice(0, selectionStart) +
      formatted +
      payloadText.slice(selectionEnd);
    setPayloadText(next);
    setPublishError(null);

    const cursor = selectionStart + formatted.length;
    requestAnimationFrame(() => {
      e.currentTarget.setSelectionRange(cursor, cursor);
    });
  }

  async function handleConnectionCheck() {
    setProbeLoading(true);
    setProbeResult(null);
    try {
      const result = await checkMqttConnection();
      setProbeResult(result);
      if (result.result.success) {
        toast.success("Conexión con el broker establecida.");
      } else {
        toast.error(result.result.message || "No se pudo conectar al broker.");
      }
    } catch (err) {
      toast.error(getMqttErrorMessage(err));
    } finally {
      setProbeLoading(false);
    }
  }

  async function handleTestMessage() {
    setTestLoading(true);
    setTestResult(null);
    try {
      const result = await sendMqttTestMessage();
      setTestResult(result);
      toast.success("Mensaje de prueba enviado.");
    } catch (err) {
      toast.error(getMqttErrorMessage(err));
    } finally {
      setTestLoading(false);
    }
  }

  async function handlePublish(e: React.FormEvent) {
    e.preventDefault();
    setPublishLoading(true);
    setPublishError(null);
    setPublishResult(null);

    let payload: MqttPublishPayload;
    try {
      const parsed: unknown = JSON.parse(payloadText);
      if (Array.isArray(parsed)) {
        if (parsed.length === 0) {
          setPublishError("El array JSON debe tener al menos un elemento.");
          setPublishLoading(false);
          return;
        }
        payload = parsed;
      } else if (parsed !== null && typeof parsed === "object") {
        const obj = parsed as Record<string, unknown>;
        if (Object.keys(obj).length === 0) {
          setPublishError("El objeto JSON debe tener al menos un campo.");
          setPublishLoading(false);
          return;
        }
        payload = obj;
      } else {
        setPublishError(
          "El payload debe ser un objeto JSON o un array JSON.",
        );
        setPublishLoading(false);
        return;
      }
    } catch {
      setPublishError("El payload no es JSON válido.");
      setPublishLoading(false);
      return;
    }

    const trimmedTopic = topic.trim();
    if (!trimmedTopic) {
      setPublishError("El tópico es obligatorio.");
      setPublishLoading(false);
      return;
    }

    try {
      const result = await publishMqttMessage({
        topic: trimmedTopic,
        payload,
      });
      setPublishResult(result);
      toast.success(`Publicado en ${trimmedTopic}`);
    } catch (err) {
      const message = getMqttErrorMessage(err);
      setPublishError(message);
      toast.error(message);
    } finally {
      setPublishLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:flex-nowrap md:items-center md:justify-between">
          <div className="min-w-0 flex-1">
            <h2 className="flex items-center gap-2 font-semibold text-card-foreground">
              <Wifi className="size-5 text-accent" />
              Conexión con el broker
            </h2>
            <p className="mt-1 text-sm text-muted">
              Prueba TCP/MQTT contra el broker configurado en el servidor.
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-2 md:flex-row md:flex-nowrap">
            <button
              type="button"
              onClick={handleConnectionCheck}
              disabled={probeLoading}
              className="inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium transition-colors hover:bg-foreground/5 disabled:opacity-50"
            >
              {probeLoading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Wifi className="size-4" />
              )}
              Probar conexión
            </button>
            <button
              type="button"
              onClick={handleTestMessage}
              disabled={testLoading}
              className="inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium transition-colors hover:bg-foreground/5 disabled:opacity-50"
            >
              {testLoading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Radio className="size-4" />
              )}
              Mensaje rápido
            </button>
          </div>
        </div>

        {probeResult && (
          <div className="mt-5">
            <JsonBlock
              title={`Probe · HTTP ${probeResult.httpStatus}`}
              status={probeResult.result.success ? "ok" : "error"}
            >
              {JSON.stringify(probeResult.result, null, 2)}
            </JsonBlock>
          </div>
        )}

        {testResult && (
          <div className="mt-4">
            <JsonBlock title="Mensaje de prueba (aeg/test)" status="ok">
              {JSON.stringify(testResult, null, 2)}
            </JsonBlock>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h2 className="flex items-center gap-2 font-semibold text-card-foreground">
          <Send className="size-5 text-accent" />
          Publicar mensaje
        </h2>
        <p className="mt-1 text-sm text-muted">
          Envía un tópico y un payload JSON (objeto o array de objetos); al
          pegar JSON válido se formatea automáticamente. La respuesta refleja la
          confirmación del API (HTTP 202).
        </p>

        <form onSubmit={handlePublish} className="mt-5 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Tópico</span>
            <input
              type="text"
              required
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className={cn(inputClass, "font-mono")}
              placeholder="aeg/test/manual"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">
              JSON (objeto o array)
            </span>
            <textarea
              ref={payloadTextareaRef}
              required
              value={payloadText}
              onChange={(e) => setPayloadText(e.target.value)}
              onPaste={handlePayloadPaste}
              className={cn(
                inputClass,
                "min-h-[120px] resize-none overflow-hidden py-1.5 font-mono text-xs leading-relaxed",
              )}
              spellCheck={false}
            />
          </label>

          {publishError && (
            <p
              role="alert"
              className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-300"
            >
              {publishError}
            </p>
          )}

          <button
            type="submit"
            disabled={publishLoading}
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground disabled:opacity-70"
          >
            {publishLoading && <Loader2 className="size-4 animate-spin" />}
            Publicar
          </button>
        </form>

        {publishResult && (
          <div className="mt-5">
            <JsonBlock
              title={`Publicación · HTTP ${publishResult.httpStatus}`}
              status="ok"
            >
              {JSON.stringify(publishResult.response, null, 2)}
            </JsonBlock>
          </div>
        )}
      </section>

      <EnajenacionTestPanel
        liveMessages={monitor.messages}
        onApplyMonitorTopic={monitor.subscribeToTopic}
      />

      <MqttMonitorPanel monitor={monitor} />
    </div>
  );
}
