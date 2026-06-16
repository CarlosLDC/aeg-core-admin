"use client";

import { useState } from "react";
import { CheckCircle2, ChevronDown, Info } from "lucide-react";
import {
  ENAJENACION_FLOW_STEPS,
  ENAJENACION_GLOBAL_SUCCESS,
  type EnajenacionFlowStep,
} from "@/lib/enajenacion-mqtt-protocol";
import { cn } from "@/lib/utils";

function StepCard({
  step,
  defaultOpen,
}: {
  step: EnajenacionFlowStep;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen ?? false);

  return (
    <div className="rounded-lg border border-border bg-background">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-foreground/[0.02]"
        aria-expanded={open}
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-semibold text-accent">
          {step.step}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-medium text-card-foreground">
            {step.name}
          </span>
          <span className="mt-0.5 block text-xs text-muted">
            {step.direction} · tópico{" "}
            <code className="font-mono text-[11px]">{step.topic}</code>
          </span>
        </span>
        <ChevronDown
          className={cn(
            "mt-1 size-4 shrink-0 text-muted transition-transform",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>

      {open ? (
        <div className="space-y-4 border-t border-border px-4 py-4 text-sm">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              Función
            </p>
            <p className="mt-1 text-card-foreground">{step.purpose}</p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              Condiciones de éxito
            </p>
            <ul className="mt-2 space-y-1.5">
              {step.successCriteria.map((criterion) => (
                <li
                  key={criterion}
                  className="flex gap-2 text-card-foreground"
                >
                  <CheckCircle2
                    className="mt-0.5 size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400"
                    aria-hidden
                  />
                  <span>{criterion}</span>
                </li>
              ))}
            </ul>
          </div>

          {step.panelSimulates ? (
            <div className="rounded-lg border border-accent/20 bg-accent/5 px-3 py-2.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-accent">
                En esta prueba
              </p>
              <p className="mt-1 text-card-foreground">{step.panelSimulates}</p>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function EnajenacionStepsGuide() {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-foreground/[0.02] p-4 text-sm">
        <div className="flex gap-2">
          <Info className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
          <div className="space-y-2 text-card-foreground">
            <p>
              Este panel <strong>simula el firmware de la impresora</strong>: tú
              publicas <code className="text-xs">ptrEnajenar</code> y las
              respuestas fiscales en CmdServer, mientras AEG Core actúa como en
              producción (valida datos y envía comandos en Comando).
            </p>
            <p className="text-muted">
              {ENAJENACION_GLOBAL_SUCCESS}
            </p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-card-foreground">
          Pasos del ritual fiscal
        </h3>
        <p className="mt-1 text-sm text-muted">
          Expande cada paso para ver su función, las respuestas que el servidor
          espera y qué hace el simulador.
        </p>
        <div className="mt-3 space-y-2">
          {ENAJENACION_FLOW_STEPS.map((step, index) => (
            <StepCard key={step.id} step={step} defaultOpen={index === 0} />
          ))}
        </div>
      </div>
    </div>
  );
}
