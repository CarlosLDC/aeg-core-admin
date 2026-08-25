"use client";

import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Loader2,
  Printer,
} from "lucide-react";
import { EnajenacionRitualStepper } from "@/components/mqtt/enajenacion-ritual-stepper";
import {
  useFiscalizacionRitual,
  type FiscalizacionPhase,
} from "@/hooks/use-fiscalizacion-ritual";
import { printerPath } from "@/lib/resource-routes";
import { cn } from "@/lib/utils";
import type { FiscalizacionSseStatus } from "@/hooks/use-fiscalizacion-sse";

function sseStatusLabel(status: FiscalizacionSseStatus): string {
  switch (status) {
    case "open":
      return "En vivo";
    case "connecting":
    case "reconnecting":
      return "Conectando…";
    case "closed":
      return "Desconectado";
    default:
      return "Sin conexión";
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

function phaseCopy(phase: FiscalizacionPhase): {
  title: string;
  body: string;
} {
  switch (phase) {
    case "setup":
      return {
        title: "Preparar datos",
        body: "Indica el registro, la MAC y un precinto disponible. Luego envía la solicitud como lo haría la impresora.",
      };
    case "waiting_ack":
      return {
        title: "Esperando ACK",
        body: "Core está validando la solicitud. Si todo está bien, publicará el ACK en Comando.",
      };
    case "waiting_result":
      return {
        title: "Esperando resultado",
        body: "El ACK ya salió. Espera la Respuesta de la impresora, o simúlala si estás depurando sin hardware.",
      };
    case "waiting_config_spiffs":
      return {
        title: "Configurando impuestos (SPIFFS)",
        body: "Fiscalización física aceptada. Core envió wFileSPIFF (configSPIFFS.json). Esperando confirmación de la impresora.",
      };
    case "done":
      return {
        title: "Listo",
        body: "Impresora creada en SIN_ASIGNAR, precinto asignado e impuestos configurados.",
      };
    case "failed":
      return {
        title: "Falló",
        body: "Corrige el problema y reinicia el ritual para intentarlo de nuevo.",
      };
  }
}

export function FiscalizacionTestPanel() {
  const ritual = useFiscalizacionRitual();
  const copy = phaseCopy(ritual.phase);
  const formLocked =
    ritual.phase !== "setup" && ritual.phase !== "failed";

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-card-foreground">
              <Printer className="size-5 text-accent" />
              Fiscalización
            </h2>
            <p className="mt-1 text-sm text-muted">
              Alta remota: solicitud → ACK → resultado. Queda{" "}
              <span className="font-medium text-card-foreground">SIN_ASIGNAR</span>.
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-medium",
                sseStatusClass(ritual.sseStatus),
              )}
            >
              {sseStatusLabel(ritual.sseStatus)}
            </span>
            <button
              type="button"
              onClick={ritual.reset}
              className="text-xs font-medium text-muted hover:text-card-foreground hover:underline"
            >
              Reiniciar
            </button>
          </div>
        </div>

        {ritual.persistentSessionError ? (
          <p
            role="alert"
            className="mt-4 flex items-start gap-2 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-950 dark:text-rose-100"
          >
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>{ritual.persistentSessionError}</span>
          </p>
        ) : null}

        <fieldset
          disabled={formLocked}
          className="mt-4 space-y-3 disabled:opacity-70"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm sm:col-span-1">
              <span className="mb-1 block font-medium">Registro</span>
              <input
                className="w-full rounded-lg border border-border bg-background px-3 py-2"
                value={ritual.form.ptrReg}
                onChange={(e) => ritual.updateForm({ ptrReg: e.target.value })}
                placeholder="GRA0000017"
                autoComplete="off"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">MAC</span>
              <input
                className="w-full rounded-lg border border-border bg-background px-3 py-2"
                value={ritual.form.mac}
                onChange={(e) => ritual.updateForm({ mac: e.target.value })}
                placeholder="20:6E:F1:88:4C:68"
                autoComplete="off"
              />
            </label>
          </div>

          <label className="block text-sm">
            <span className="mb-1 block font-medium">Precinto</span>
            <select
              className="w-full rounded-lg border border-border bg-background px-3 py-2"
              disabled={ritual.sealsLoading}
              value={ritual.selectedSealId}
              onChange={(e) => ritual.selectSeal(e.target.value)}
            >
              <option value="">
                {ritual.sealsLoading
                  ? "Cargando…"
                  : ritual.availableSeals.length === 0
                    ? "No hay precintos disponibles"
                    : "Elegir precinto disponible…"}
              </option>
              {ritual.availableSeals.map((seal) => (
                <option key={seal.id} value={String(seal.id)}>
                  {seal.serial} · {seal.color}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={() => ritual.setShowAdvanced((v) => !v)}
            className="inline-flex items-center gap-1 text-xs font-medium text-muted hover:text-card-foreground"
          >
            {ritual.showAdvanced ? (
              <ChevronUp className="size-3.5" />
            ) : (
              <ChevronDown className="size-3.5" />
            )}
            {ritual.showAdvanced ? "Ocultar opciones" : "Más opciones"}
          </button>

          {ritual.showAdvanced ? (
            <div className="grid gap-3 rounded-lg border border-border/70 bg-foreground/[0.02] p-3 sm:grid-cols-2">
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
                <span className="mb-1 block font-medium">Modelo</span>
                <input
                  className="w-full rounded-lg border border-border bg-background px-3 py-2"
                  value={ritual.form.model}
                  onChange={(e) => ritual.updateForm({ model: e.target.value })}
                  placeholder="AEG-R1"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium">PrecintoNro</span>
                <input
                  className="w-full rounded-lg border border-border bg-background px-3 py-2"
                  value={ritual.form.precintoNro}
                  onChange={(e) => {
                    ritual.selectSeal("");
                    ritual.updateForm({ precintoNro: e.target.value });
                  }}
                  placeholder="G1B0033"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium">Color</span>
                <input
                  className="w-full rounded-lg border border-border bg-background px-3 py-2"
                  value={ritual.form.precintoColor}
                  onChange={(e) =>
                    ritual.updateForm({ precintoColor: e.target.value })
                  }
                  placeholder="Azul"
                />
              </label>
            </div>
          ) : null}
        </fieldset>
      </section>

      {ritual.phase === "done" ? (
        <section className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 size-5 text-emerald-700 dark:text-emerald-300" />
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-emerald-900 dark:text-emerald-100">
                Fiscalización completada
              </h3>
              <p className="mt-1 text-sm text-emerald-900/80 dark:text-emerald-100/80">
                Impresora en SIN_ASIGNAR
                {ritual.completedPrinterId
                  ? ` · id ${ritual.completedPrinterId}`
                  : ""}
                .
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                {ritual.completedPrinterId ? (
                  <Link
                    href={printerPath(ritual.completedPrinterId)}
                    className="text-sm font-medium text-accent hover:underline"
                  >
                    Ver ficha
                  </Link>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    void ritual.refreshSeals();
                    ritual.reset();
                  }}
                  className="text-sm font-medium text-muted hover:text-card-foreground hover:underline"
                >
                  Nueva fiscalización
                </button>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <div className="space-y-4">
          <EnajenacionRitualStepper
            steps={ritual.ritualSteps}
            stepStatuses={ritual.stepStatuses}
            activeStepIndex={Math.min(
              ritual.activeStepIndex,
              ritual.ritualSteps.length - 1,
            )}
            displayStepIndex={Math.min(
              ritual.activeStepIndex,
              ritual.ritualSteps.length - 1,
            )}
            onSelectStep={() => undefined}
          />

          <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">
              Ahora
            </p>
            <h3 className="mt-1 text-lg font-semibold text-card-foreground">
              {copy.title}
            </h3>
            <p className="mt-2 text-sm text-muted">{copy.body}</p>

            {ritual.phase === "setup" ? (
              <div className="mt-4 space-y-3">
                <button
                  type="button"
                  disabled={ritual.busy || !ritual.canStart}
                  onClick={() => void ritual.publishRequest()}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-foreground disabled:opacity-50 sm:w-auto"
                >
                  {ritual.busy ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : null}
                  Enviar solicitud
                </button>
                {!ritual.canStart ? (
                  <p className="text-xs text-muted">
                    Completa registro, MAC y precinto para continuar.
                  </p>
                ) : null}
                <details className="text-sm">
                  <summary className="cursor-pointer text-xs font-medium text-muted hover:text-card-foreground">
                    Hardware real (opcional)
                  </summary>
                  <div className="mt-2 space-y-2 rounded-lg border border-border/70 p-3">
                    <p className="text-xs text-muted">
                      Dispara <code className="text-[11px]">ptrFiscalizarRemoto</code>{" "}
                      hacia la impresora. Ella debería responder con la solicitud en
                      CmdServer.
                    </p>
                    <button
                      type="button"
                      disabled={ritual.busy || !ritual.canStart}
                      onClick={() => void ritual.publishRemotoKickoff()}
                      className="rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-foreground/5 disabled:opacity-50"
                    >
                      Enviar a impresora
                    </button>
                  </div>
                </details>
              </div>
            ) : null}

            {ritual.phase === "waiting_ack" ? (
              <div className="mt-4 flex items-center gap-2 text-sm text-amber-800 dark:text-amber-200">
                <Loader2 className="size-4 animate-spin" />
                Validando en Core…
              </div>
            ) : null}

            {ritual.phase === "waiting_result" ? (
              <div className="mt-4 space-y-3">
                {ritual.ackPayload ? (
                  <pre className="max-h-28 overflow-auto rounded-lg bg-foreground/5 p-3 text-xs">
                    {ritual.ackPayload}
                  </pre>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={ritual.busy}
                    onClick={() => void ritual.simulateResult(true)}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-foreground disabled:opacity-50"
                  >
                    {ritual.busy ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : null}
                    Simular resultado OK
                  </button>
                  <button
                    type="button"
                    disabled={ritual.busy}
                    onClick={() => void ritual.simulateResult(false)}
                    className="rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-foreground/5 disabled:opacity-50"
                  >
                    Simular error
                  </button>
                </div>
                <p className="text-xs text-muted">
                  Con hardware real no hace falta simular: la impresora publica en
                  Respuesta.
                </p>
              </div>
            ) : null}

            {ritual.phase === "waiting_config_spiffs" ? (
              <div className="mt-4 space-y-3">
                <div className="flex items-center gap-2 text-sm text-emerald-800 dark:text-emerald-200">
                  <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                  Alta de impresora confirmada. Enviando impuestos (`wFileSPIFF`)…
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={ritual.busy}
                    onClick={() => void ritual.simulateConfigSpiffsResult(true)}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-foreground disabled:opacity-50"
                  >
                    {ritual.busy ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : null}
                    Simular config SPIFFS OK
                  </button>
                  <button
                    type="button"
                    disabled={ritual.busy}
                    onClick={() => void ritual.simulateConfigSpiffsResult(false)}
                    className="rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-foreground/5 disabled:opacity-50"
                  >
                    Simular error en SPIFFS
                  </button>
                </div>
              </div>
            ) : null}

            {ritual.phase === "failed" ? (
              <div className="mt-4">
                <button
                  type="button"
                  onClick={ritual.reset}
                  className="rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-foreground"
                >
                  Reintentar
                </button>
              </div>
            ) : null}
          </section>
        </div>
      )}
    </div>
  );
}
