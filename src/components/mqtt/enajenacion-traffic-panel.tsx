"use client";

import Link from "next/link";
import { ArrowLeft, Loader2, Radio } from "lucide-react";
import {
  CopyTextButton,
  EnajenacionStepDetails,
} from "@/components/mqtt/enajenacion-step-actions";
import { useEnajenacionTraffic } from "@/hooks/use-enajenacion-traffic";
import { formatEnajenacionTrafficExport } from "@/lib/enajenacion-traffic-catalog";
import { cn } from "@/lib/utils";
import type { EnajenacionTrafficEntry } from "@/lib/enajenacion-traffic-catalog";

const MQTT_WORKSPACE_TAB_KEY = "mqtt-workspace-tab";

function sseStatusLabel(status: string): string {
  switch (status) {
    case "open":
      return "SSE conectado";
    case "connecting":
      return "SSE conectando…";
    case "reconnecting":
      return "SSE reconectando…";
    case "closed":
      return "SSE desconectado";
    default:
      return "SSE inactivo";
  }
}

function sseStatusClass(status: string): string {
  switch (status) {
    case "open":
      return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
    case "connecting":
    case "reconnecting":
      return "bg-amber-500/10 text-amber-800 dark:text-amber-200";
    case "closed":
      return "bg-rose-500/10 text-rose-800 dark:text-rose-200";
    default:
      return "bg-foreground/5 text-muted";
  }
}

function TopicRow({ label, topic }: { label: string; topic: string }) {
  return (
    <div className="rounded-lg border border-border bg-foreground/[0.02] px-3 py-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted">{label}</p>
          <p className="mt-0.5 font-mono text-xs break-all text-card-foreground">
            {topic}
          </p>
        </div>
        <CopyTextButton text={topic} label={label} />
      </div>
    </div>
  );
}

function TrafficStepCard({ entry }: { entry: EnajenacionTrafficEntry }) {
  const printerCopyText = entry.printerMessage
    ? `Tópico: ${entry.printerMessage.topic}\n\n${entry.printerMessage.payload}`
    : "";

  const serverCopyText = entry.serverMessage
    ? `Tópico: ${entry.serverMessage.topic}\n\n${entry.serverMessage.payload}`
    : "";

  return (
    <article className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            Paso {entry.step}
          </p>
          <h3 className="mt-0.5 text-base font-semibold text-card-foreground">
            {entry.name}
          </h3>
          <p className="mt-1 text-xs text-muted">{entry.direction}</p>
        </div>
        {entry.serverOrigin === "live" ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/10 px-2.5 py-0.5 text-xs font-medium text-sky-800 dark:text-sky-200">
            <Radio className="size-3" aria-hidden />
            En vivo
          </span>
        ) : null}
      </div>

      <div className="mt-4 space-y-3">
        {entry.printerMessage ? (
          <EnajenacionStepDetails
            label="Impresora (CmdServer)"
            copyText={printerCopyText}
            copyLabel="Mensaje impresora"
          />
        ) : null}

        {entry.stepId !== "request" ? (
          <EnajenacionStepDetails
            label={
              entry.serverOrigin === "live"
                ? "Servidor (Comando) — en vivo"
                : entry.serverOrigin === "template"
                  ? "Servidor (Comando) — plantilla"
                  : "Servidor (Comando)"
            }
            copyText={serverCopyText}
            copyLabel="Mensaje servidor"
            emptyMessage="Sin comando de servidor para este paso."
          />
        ) : null}
      </div>
    </article>
  );
}

export function EnajenacionTrafficPanel() {
  const traffic = useEnajenacionTraffic();

  if (traffic.printerLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted">
        <Loader2 className="size-4 animate-spin" />
        Cargando impresora…
      </div>
    );
  }

  if (traffic.printerError || !traffic.printer) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Link
          href="/mqtt-tests"
          onClick={() => {
            sessionStorage.setItem(MQTT_WORKSPACE_TAB_KEY, "enajenacion");
          }}
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-card-foreground"
        >
          <ArrowLeft className="size-4" />
          Volver a Enajenación
        </Link>
        <p className="rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-6 text-sm text-red-700 dark:text-red-300">
          {traffic.printerError ?? "Impresora no encontrada."}
        </p>
      </div>
    );
  }

  const exportText =
    traffic.topics && traffic.catalog.length > 0
      ? formatEnajenacionTrafficExport(traffic.topics, traffic.catalog)
      : "";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <Link
          href="/mqtt-tests"
          onClick={() => {
            sessionStorage.setItem(MQTT_WORKSPACE_TAB_KEY, "enajenacion");
          }}
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-card-foreground"
        >
          <ArrowLeft className="size-4" />
          Volver a Enajenación
        </Link>
        <span
          className={cn(
            "rounded-full px-2.5 py-0.5 text-xs font-medium",
            sseStatusClass(traffic.sseStatus),
          )}
        >
          {sseStatusLabel(traffic.sseStatus)}
        </span>
      </div>

      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-card-foreground">
          Tráfico MQTT — Enajenación
        </h2>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium text-muted">Serial fiscal</dt>
            <dd className="mt-0.5 font-mono text-card-foreground">
              {traffic.printer.fiscalSerial}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted">Cliente</dt>
            <dd className="mt-0.5 text-card-foreground">{traffic.clientName}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs font-medium text-muted">MAC</dt>
            <dd className="mt-0.5 font-mono break-all text-card-foreground">
              {traffic.printer.macAddress}
            </dd>
          </div>
        </dl>
      </section>

      {traffic.topics ? (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-card-foreground">Tópicos</h3>
          <div className="grid gap-2">
            <TopicRow label="CmdServer" topic={traffic.topics.cmdServer} />
            <TopicRow label="Comando" topic={traffic.topics.comando} />
            <TopicRow label="Monitor MQTT" topic={traffic.topics.monitor} />
          </div>
        </section>
      ) : null}

      {traffic.commandContextLoading ? (
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted">
          <Loader2 className="size-4 animate-spin" />
          Cargando datos fiscales del cliente…
        </div>
      ) : traffic.commandContextError ? (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
          {traffic.commandContextError}
        </p>
      ) : null}

      {traffic.catalog.length > 0 ? (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-card-foreground">
              Mensajes del ritual ({traffic.catalog.length} pasos)
            </h3>
            <CopyTextButton text={exportText} label="Catálogo completo" />
          </div>
          <div className="space-y-3">
            {traffic.catalog.map((entry) => (
              <TrafficStepCard key={entry.stepId} entry={entry} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
