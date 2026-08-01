"use client";

import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Printer,
} from "lucide-react";
import { EnajenacionRitualStepper } from "@/components/mqtt/enajenacion-ritual-stepper";
import { useFiscalizacionRitual } from "@/hooks/use-fiscalizacion-ritual";
import { printerPath } from "@/lib/resource-routes";
import { cn } from "@/lib/utils";
import type { FiscalizacionSseStatus } from "@/hooks/use-fiscalizacion-sse";

function sseStatusLabel(status: FiscalizacionSseStatus): string {
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

function sseStatusClass(status: FiscalizacionSseStatus): string {
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

export function FiscalizacionTestPanel() {
  const ritual = useFiscalizacionRitual();

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-card-foreground">
            <Printer className="size-5 text-accent" />
            Fiscalización MQTT
          </h2>
          <button
            type="button"
            onClick={ritual.reset}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-foreground/5"
          >
            Reiniciar
          </button>
        </div>
        <p className="mt-2 text-sm text-muted">
          Simula <code className="text-xs">ptrFiscalizar</code> como lo haría la
          impresora, o dispara <code className="text-xs">ptrFiscalizarRemoto</code>{" "}
          hacia hardware real. Tras éxito, Core crea la impresora en{" "}
          <strong>SIN_ASIGNAR</strong> y asigna el precinto.
        </p>

        <div className="mt-3">
          <span
            className={cn(
              "rounded-full px-2.5 py-0.5 text-xs font-medium",
              sseStatusClass(ritual.sseStatus),
            )}
          >
            {sseStatusLabel(ritual.sseStatus)}
          </span>
        </div>

        {ritual.persistentSessionError ? (
          <p
            role="alert"
            className="mt-3 flex items-start gap-2 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-950 dark:text-rose-100"
          >
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>{ritual.persistentSessionError}</span>
          </p>
        ) : null}

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Registro (ptrReg)</span>
            <input
              className="w-full rounded-lg border border-border bg-background px-3 py-2"
              value={ritual.form.ptrReg}
              onChange={(e) => ritual.updateForm({ ptrReg: e.target.value })}
              placeholder="GRA0000017"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">MAC</span>
            <input
              className="w-full rounded-lg border border-border bg-background px-3 py-2"
              value={ritual.form.mac}
              onChange={(e) => ritual.updateForm({ mac: e.target.value })}
              placeholder="20:6E:F1:88:4C:68"
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1 block font-medium">Precinto disponible</span>
            <select
              className="w-full rounded-lg border border-border bg-background px-3 py-2"
              disabled={ritual.sealsLoading}
              defaultValue=""
              onChange={(e) => ritual.selectSeal(e.target.value)}
            >
              <option value="">
                {ritual.sealsLoading
                  ? "Cargando precintos…"
                  : "Seleccionar precinto…"}
              </option>
              {ritual.availableSeals.map((seal) => (
                <option key={seal.id} value={seal.id}>
                  {seal.serial} · {seal.color}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">PrecintoNro</span>
            <input
              className="w-full rounded-lg border border-border bg-background px-3 py-2"
              value={ritual.form.precintoNro}
              onChange={(e) =>
                ritual.updateForm({ precintoNro: e.target.value })
              }
              placeholder="G1B0033"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">PrecintoColor</span>
            <input
              className="w-full rounded-lg border border-border bg-background px-3 py-2"
              value={ritual.form.precintoColor}
              onChange={(e) =>
                ritual.updateForm({ precintoColor: e.target.value })
              }
              placeholder="Azul"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Firmware</span>
            <input
              className="w-full rounded-lg border border-border bg-background px-3 py-2"
              value={ritual.form.firmwareVersion}
              onChange={(e) =>
                ritual.updateForm({ firmwareVersion: e.target.value })
              }
              placeholder="1.1.0"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Modelo (codigo_modelo)</span>
            <input
              className="w-full rounded-lg border border-border bg-background px-3 py-2"
              value={ritual.form.model}
              onChange={(e) => ritual.updateForm({ model: e.target.value })}
              placeholder="AEG-R1"
            />
          </label>
        </div>

        {ritual.topics ? (
          <p className="mt-3 text-xs text-muted">
            CmdServer: {ritual.topics.cmdServer}
          </p>
        ) : null}
      </section>

      {!ritual.ritualComplete ? (
        <div className="space-y-4">
          <EnajenacionRitualStepper
            steps={ritual.ritualSteps}
            stepStatuses={ritual.stepStatuses}
            activeStepIndex={ritual.activeStepIndex}
            displayStepIndex={ritual.activeStepIndex}
            onSelectStep={() => undefined}
          />

          <section className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-3">
            <h3 className="font-semibold text-card-foreground">
              Acciones de debug
            </h3>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={ritual.busy}
                onClick={() => void ritual.publishRequest()}
                className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-foreground disabled:opacity-50"
              >
                {ritual.busy ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  "Simular ptrFiscalizar (CmdServer)"
                )}
              </button>
              <button
                type="button"
                disabled={ritual.busy}
                onClick={() => void ritual.publishRemotoKickoff()}
                className="rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-foreground/5 disabled:opacity-50"
              >
                Enviar ptrFiscalizarRemoto (Comando)
              </button>
              <button
                type="button"
                disabled={ritual.busy || ritual.activeStepIndex < 1}
                onClick={() => void ritual.simulateResult(true)}
                className="rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-foreground/5 disabled:opacity-50"
              >
                Simular resultado OK
              </button>
              <button
                type="button"
                disabled={ritual.busy || ritual.activeStepIndex < 1}
                onClick={() => void ritual.simulateResult(false)}
                className="rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-foreground/5 disabled:opacity-50"
              >
                Simular resultado error
              </button>
            </div>
            {ritual.ackPayload ? (
              <pre className="max-h-40 overflow-auto rounded-lg bg-foreground/5 p-3 text-xs">
                {ritual.ackPayload}
              </pre>
            ) : null}
          </section>
        </div>
      ) : (
        <section className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 size-5 text-emerald-700 dark:text-emerald-300" />
            <div>
              <h3 className="font-semibold text-emerald-900 dark:text-emerald-100">
                Fiscalización completada
              </h3>
              <p className="mt-1 text-sm text-emerald-900/80 dark:text-emerald-100/80">
                Impresora creada en estado SIN_ASIGNAR
                {ritual.completedPrinterId
                  ? ` (id ${ritual.completedPrinterId})`
                  : ""}
                .
              </p>
              {ritual.completedPrinterId ? (
                <Link
                  href={printerPath(ritual.completedPrinterId)}
                  className="mt-2 inline-block text-sm font-medium text-accent hover:underline"
                >
                  Ver ficha de impresora
                </Link>
              ) : null}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
