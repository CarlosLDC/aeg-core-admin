import Link from "next/link";
import {
  ANNUAL_INSPECTION_ADMIN_PANEL_INTRO,
  ANNUAL_INSPECTION_FLOW_STEPS,
  ANNUAL_INSPECTION_GLOBAL_INTRO,
  ANNUAL_INSPECTION_GLOBAL_RULES,
  ANNUAL_INSPECTION_INSP_AO_MAPPING,
  ANNUAL_INSPECTION_LIBRO_FISCAL_INTRO,
  ANNUAL_INSPECTION_STATE_VARIABLES,
  LIBRO_FISCAL_INSPECTION_WORKFLOW,
} from "@/lib/annual-inspection-mqtt-protocol";
import { ENAJENACION_MQTT_DOCS_PATH } from "@/lib/mqtt-docs-paths";

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-8">
      <h2 className="mb-5 border-b border-border pb-2 text-xl font-semibold tracking-tight text-foreground">
        {title}
      </h2>
      <div className="space-y-4 text-[15px] leading-relaxed text-muted">{children}</div>
    </section>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p>{children}</p>;
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-foreground/[0.06] px-1.5 py-0.5 font-mono text-[0.85em] text-foreground">
      {children}
    </code>
  );
}

export function AnnualInspectionMqttDocsContent() {
  return (
    <article className="mx-auto max-w-3xl px-6 py-12 sm:px-8 lg:py-16">
      <header className="mb-14">
        <p className="text-sm font-medium uppercase tracking-wide text-muted">
          AEG Core · Referencia técnica
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Inspección anual obligatoria (Remoto) — Libro fiscal
        </h1>
        <P>
          Ritual fiscal que registra en la impresora el estado del precinto, etiqueta,
          factura, nota de crédito y sensor de papel. En producción se ejecuta desde{" "}
          <strong className="font-semibold text-foreground">aeg-core-fiscalbooks</strong>;
          el panel admin expone la misma API para diagnóstico.
        </P>
        <P>
          Tópicos y patrón de respuesta: igual que enajenación pasos 2–7 (
          <Code>Comando</Code> / <Code>Respuesta</Code>). Ver también{" "}
          <Link
            href={ENAJENACION_MQTT_DOCS_PATH}
            className="font-medium text-accent hover:underline"
          >
            protocolo de enajenación Remoto
          </Link>
          .
        </P>
      </header>

      <div className="space-y-14">
        <Section id="intro" title="¿Qué es la inspección anual obligatoria?">
          <P>{ANNUAL_INSPECTION_GLOBAL_INTRO}</P>
          <P>{ANNUAL_INSPECTION_LIBRO_FISCAL_INTRO}</P>
          <P>{ANNUAL_INSPECTION_ADMIN_PANEL_INTRO}</P>
        </Section>

        <Section id="libro-fiscal" title="Flujo en el libro fiscal (operación de campo)">
          <ol className="space-y-5">
            {LIBRO_FISCAL_INSPECTION_WORKFLOW.map((item) => (
              <li key={item.order} className="flex gap-4">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent/15 text-sm font-semibold text-accent">
                  {item.order}
                </span>
                <div>
                  <p className="font-semibold text-foreground">{item.title}</p>
                  <p className="mt-1">{item.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </Section>

        <Section id="state" title="Variables de estado">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[28rem] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-muted">
                  <th className="py-2 pr-4 font-medium">Variable</th>
                  <th className="py-2 pr-4 font-medium">Se obtiene en</th>
                  <th className="py-2 font-medium">Se usa en</th>
                </tr>
              </thead>
              <tbody className="text-foreground">
                {ANNUAL_INSPECTION_STATE_VARIABLES.map((row) => (
                  <tr key={row.name} className="border-b border-border/60">
                    <td className="py-2 pr-4 font-mono">{row.name}</td>
                    <td className="py-2 pr-4">{row.obtainedIn}</td>
                    <td className="py-2">{row.usedIn}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section id="protocol" title="Protocolo Remoto — pasos 1 a 5">
          <ol className="space-y-8">
            {ANNUAL_INSPECTION_FLOW_STEPS.map((step) => (
              <li key={step.id} className="rounded-lg border border-border bg-foreground/[0.02] p-5">
                <p className="text-sm font-medium text-muted">Paso {step.step}</p>
                <p className="mt-1 text-lg font-semibold text-foreground">{step.name}</p>
                <p className="mt-2">{step.purpose}</p>
                <p className="mt-3 text-sm font-semibold text-foreground">
                  Criterios de éxito
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {step.successCriteria.map((criterion) => (
                    <li key={criterion}>{criterion}</li>
                  ))}
                </ul>
                <p className="mt-3 text-sm">
                  <strong className="text-foreground">Libro fiscal:</strong>{" "}
                  {step.libroFiscalAction}
                </p>
                <p className="mt-1 text-sm">
                  <strong className="text-foreground">Panel admin:</strong>{" "}
                  {step.adminPanelAction}
                </p>
              </li>
            ))}
          </ol>
        </Section>

        <Section id="insp-ao" title="Mapeo checklist → inspAO (SetDateRevO)">
          <P>
            El campo <Code>data</Code> de SetDateRevO es timestamp Unix en segundos menos
            4 horas (hora local Venezuela naive). El objeto <Code>inspAO</Code> se arma
            así:
          </P>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[24rem] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-muted">
                  <th className="py-2 pr-4 font-medium">Campo</th>
                  <th className="py-2 pr-4 font-medium">Checklist</th>
                  <th className="py-2 pr-4 font-medium">☑</th>
                  <th className="py-2 font-medium">☐</th>
                </tr>
              </thead>
              <tbody className="text-foreground">
                {ANNUAL_INSPECTION_INSP_AO_MAPPING.map((row) => (
                  <tr key={row.field} className="border-b border-border/60">
                    <td className="py-2 pr-4 font-mono">{row.field}</td>
                    <td className="py-2 pr-4">{row.checklist}</td>
                    <td className="py-2 pr-4">{row.checked}</td>
                    <td className="py-2">{row.unchecked}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section id="payloads" title="Comandos de referencia">
          <P>
            <strong className="text-foreground">Paso 1 — StaInf</strong>
          </P>
          <pre className="overflow-x-auto rounded-lg bg-foreground/[0.04] p-4 font-mono text-sm text-foreground">
            {`{"cmd":"StaInf","data":{"status":"NroRegMa"}}`}
          </pre>
          <P>
            <strong className="text-foreground">Paso 3 — Factura de prueba</strong> (orden
            obligatorio)
          </P>
          <pre className="overflow-x-auto rounded-lg bg-foreground/[0.04] p-4 font-mono text-sm text-foreground">
            {`[
  { "cmd": "proF", "data": { "pre": 100, "cant": 1000, "imp": 1, "des01": "COLGATE TOTAL" } },
  { "cmd": "subToF", "data": 1, "valor": 0 },
  { "cmd": "fpaF", "data": { "tipo": 1, "monto": -1, "tasaConv": 0 } },
  { "cmd": "endFac", "data": 1 }
]`}
          </pre>
          <P>
            <strong className="text-foreground">Paso 4 — Nota de crédito</strong>: campos
            dinámicos <Code>nroFacNC</Code>, <Code>fechFacNC</Code> (fecha sistema) y{" "}
            <Code>conSerNC</Code>; el resto fijo en el servidor.
          </P>
          <P>
            <strong className="text-foreground">Paso 5 — SetDateRevO</strong>
          </P>
          <pre className="overflow-x-auto rounded-lg bg-foreground/[0.04] p-4 font-mono text-sm text-foreground">
            {`{
  "cmd": "SetDateRevO",
  "data": 1782259200,
  "inspAO": {
    "precinto": "Bien",
    "etiqFisc": "Bien",
    "impFact": "Bien",
    "impNC": "Bien",
    "sensPapel": "Bien"
  }
}`}
          </pre>
        </Section>

        <Section id="rules" title="Reglas generales">
          <ul className="list-disc space-y-2 pl-5">
            {ANNUAL_INSPECTION_GLOBAL_RULES.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
        </Section>

        <Section id="api" title="Endpoints AEG Core">
          <ul className="list-disc space-y-2 pl-5 font-mono text-sm text-foreground">
            <li>POST /api/mqtt/annual-inspection/sta-inf</li>
            <li>POST /api/mqtt/annual-inspection/test-invoice</li>
            <li>POST /api/mqtt/annual-inspection/test-credit-note</li>
            <li>POST /api/mqtt/annual-inspection/submit</li>
          </ul>
          <P>
            Tras submit exitoso en el libro fiscal, el formulario persiste{" "}
            <Code>mqttRegistroImpresora</Code>, <Code>mqttSetDateRevOAt</Code> y{" "}
            <Code>mqttNumeroFacturaPrueba</Code> en <Code>inspecciones_anuales</Code>.
          </P>
        </Section>
      </div>

      <footer className="mt-16 border-t border-border pt-8 text-sm text-muted">
        Alpha Engineer Group · Documentación interna
      </footer>
    </article>
  );
}
