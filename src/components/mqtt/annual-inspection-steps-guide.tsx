"use client";

import Link from "next/link";
import { useState } from "react";
import { BookOpen, CheckCircle2, ChevronDown, Info } from "lucide-react";
import {
  ANNUAL_INSPECTION_ADMIN_PANEL_INTRO,
  ANNUAL_INSPECTION_FLOW_STEPS,
  ANNUAL_INSPECTION_GLOBAL_INTRO,
  ANNUAL_INSPECTION_GLOBAL_RULES,
  ANNUAL_INSPECTION_INSP_AO_MAPPING,
  ANNUAL_INSPECTION_LIBRO_FISCAL_INTRO,
  ANNUAL_INSPECTION_STATE_VARIABLES,
  LIBRO_FISCAL_INSPECTION_WORKFLOW,
  type AnnualInspectionFlowStep,
} from "@/lib/annual-inspection-mqtt-protocol";
import { ANNUAL_INSPECTION_MQTT_DOCS_PATH } from "@/lib/mqtt-docs-paths";
import { cn } from "@/lib/utils";

function FlowStepCard({
  step,
  defaultOpen,
}: {
  step: AnnualInspectionFlowStep;
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
          <span className="block font-medium text-card-foreground">{step.name}</span>
          <span className="mt-0.5 block text-xs text-muted">
            {step.direction} · <code className="font-mono text-[11px]">{step.topic}</code>
            {" · respuesta en "}
            <code className="font-mono text-[11px]">{step.responseTopic}</code>
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
              Qué ocurre
            </p>
            <p className="mt-1 text-card-foreground">{step.purpose}</p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              Criterios de éxito
            </p>
            <ul className="mt-2 space-y-1.5">
              {step.successCriteria.map((criterion) => (
                <li key={criterion} className="flex gap-2 text-card-foreground">
                  <CheckCircle2
                    className="mt-0.5 size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400"
                    aria-hidden
                  />
                  <span>{criterion}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-lg border border-sky-500/20 bg-sky-500/5 px-3 py-2.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-sky-800 dark:text-sky-200">
              En el libro fiscal
            </p>
            <p className="mt-1 text-card-foreground">{step.libroFiscalAction}</p>
          </div>

          <div className="rounded-lg border border-accent/20 bg-accent/5 px-3 py-2.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-accent">
              En esta pestaña (admin)
            </p>
            <p className="mt-1 text-card-foreground">{step.adminPanelAction}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function AnnualInspectionStepsGuide() {
  return (
    <section
      className="rounded-xl border border-border bg-card p-5 shadow-sm"
      aria-labelledby="annual-inspection-guide-title"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2
          id="annual-inspection-guide-title"
          className="flex items-center gap-2 text-lg font-semibold text-card-foreground"
        >
          <BookOpen className="size-5 text-accent" aria-hidden />
          Prueba en el libro fiscal — qué debe ocurrir
        </h2>
        <Link
          href={ANNUAL_INSPECTION_MQTT_DOCS_PATH}
          className="text-sm font-medium text-accent hover:underline"
        >
          Referencia completa
        </Link>
      </div>

      <div className="mt-4 space-y-4">
        <div className="rounded-lg border border-border bg-foreground/[0.02] p-4 text-sm">
          <div className="flex gap-2">
            <Info className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
            <div className="space-y-2 text-card-foreground">
              <p>{ANNUAL_INSPECTION_GLOBAL_INTRO}</p>
              <p>{ANNUAL_INSPECTION_LIBRO_FISCAL_INTRO}</p>
              <p className="text-muted">{ANNUAL_INSPECTION_ADMIN_PANEL_INTRO}</p>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-card-foreground">
            Flujo en el libro fiscal (operación de campo)
          </h3>
          <p className="mt-1 text-sm text-muted">
            Secuencia que debe seguir el técnico o distribuidor al registrar una
            inspección anual en aeg-core-fiscalbooks.
          </p>
          <ol className="mt-3 space-y-3">
            {LIBRO_FISCAL_INSPECTION_WORKFLOW.map((item) => (
              <li key={item.order} className="flex gap-3 text-sm">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-foreground/5 text-xs font-semibold text-foreground">
                  {item.order}
                </span>
                <div>
                  <p className="font-medium text-card-foreground">{item.title}</p>
                  <p className="mt-0.5 text-muted">{item.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="border-t border-border pt-4">
          <h3 className="text-sm font-semibold text-card-foreground">
            Instrucciones del protocolo Remoto (pasos 1–5)
          </h3>
          <p className="mt-1 text-sm text-muted">
            Detalle de cada comando, respuesta esperada y acción en libro fiscal vs.
            panel admin. Expanda cada paso para ver criterios de éxito.
          </p>
          <div className="mt-3 space-y-2">
            {ANNUAL_INSPECTION_FLOW_STEPS.map((step, index) => (
              <FlowStepCard key={step.id} step={step} defaultOpen={index === 0} />
            ))}
          </div>
        </div>

        <div className="border-t border-border pt-4">
          <h3 className="text-sm font-semibold text-card-foreground">
            Variables de estado durante el flujo
          </h3>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[28rem] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-muted">
                  <th className="py-2 pr-3 font-medium">Variable</th>
                  <th className="py-2 pr-3 font-medium">Se obtiene en</th>
                  <th className="py-2 font-medium">Se usa en</th>
                </tr>
              </thead>
              <tbody className="text-card-foreground">
                {ANNUAL_INSPECTION_STATE_VARIABLES.map((row) => (
                  <tr key={row.name} className="border-b border-border/60">
                    <td className="py-2 pr-3 font-mono text-xs">{row.name}</td>
                    <td className="py-2 pr-3">{row.obtainedIn}</td>
                    <td className="py-2">{row.usedIn}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="border-t border-border pt-4">
          <h3 className="text-sm font-semibold text-card-foreground">
            Mapeo checklist → inspAO (SetDateRevO)
          </h3>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[24rem] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-muted">
                  <th className="py-2 pr-3 font-medium">Campo</th>
                  <th className="py-2 pr-3 font-medium">Fila del checklist</th>
                  <th className="py-2 pr-3 font-medium">☑ Marcado</th>
                  <th className="py-2 font-medium">☐ Sin marcar</th>
                </tr>
              </thead>
              <tbody className="text-card-foreground">
                {ANNUAL_INSPECTION_INSP_AO_MAPPING.map((row) => (
                  <tr key={row.field} className="border-b border-border/60">
                    <td className="py-2 pr-3 font-mono text-xs">{row.field}</td>
                    <td className="py-2 pr-3">{row.checklist}</td>
                    <td className="py-2 pr-3">{row.checked}</td>
                    <td className="py-2">{row.unchecked}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="border-t border-border pt-4">
          <h3 className="text-sm font-semibold text-card-foreground">
            Reglas generales
          </h3>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-card-foreground">
            {ANNUAL_INSPECTION_GLOBAL_RULES.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
