"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, BookOpen, List } from "lucide-react";
import { cn } from "@/lib/utils";

const ENajenacionSteps = [
  {
    step: "1",
    name: "Solicitud de enajenación",
    direction: "Impresora → servidor",
    topic: "CmdServer",
    summary:
      "Al encender, la impresora publica ptrEnajenar con ptrReg (serial fiscal) y macAddr.",
  },
  {
    step: "2a",
    name: "DNF de alerta",
    direction: "Servidor → impresora",
    topic: "Comando",
    summary:
      "Imprime un documento no fiscal advirtiendo que no debe usarse hasta el Reporte Z. Éxito: endDNF con dataD = 7.",
  },
  {
    step: "3a",
    name: "RIF y razón social",
    direction: "Servidor → impresora",
    topic: "Comando",
    summary: "Comando fiscalAEG: graba rifEmp.json con datos del cliente en BD.",
  },
  {
    step: "3b",
    name: "Encabezado / dirección",
    direction: "Servidor → impresora",
    topic: "Comando",
    summary:
      "wFileSPIFF → paramFacSPIFF.json (dirección, ciudad, tipo de contribuyente).",
  },
  {
    step: "3c",
    name: "Impuestos y formas de pago",
    direction: "Servidor → impresora",
    topic: "Comando",
    summary: "wFileSPIFF → configSPIFFS.json (plantilla fija en el servidor).",
  },
  {
    step: "4",
    name: "Estatus del registro",
    direction: "Pendiente spec firmware",
    topic: "Comando",
    summary:
      "Consulta de registro fiscal tras la configuración. Hoy el servidor omite este paso (skip-registration-status).",
  },
  {
    step: "5",
    name: "Factura de prueba",
    direction: "Servidor → impresora",
    topic: "Comando",
    summary:
      "8 comandos (5 líneas proF, subToF, fpaF, endFac). Éxito: endFac dataD = 8, subToF dataD = 555.",
  },
  {
    step: "6",
    name: "Nota de crédito",
    direction: "Servidor → impresora",
    topic: "Comando",
    summary:
      "13 comandos que anulan la factura de prueba. Éxito: endNC dataD = 10, cada prodNC dataD = 9.",
  },
  {
    step: "7",
    name: "Reporte Z",
    direction: "Servidor → impresora",
    topic: "Comando",
    summary:
      "genImpRepZ cierra el ritual fiscal. Tras OK, AEG Core marca la impresora ENAJENADA en BD.",
  },
] as const;

export const ENAJENACION_DOC_SECTIONS = [
  { id: "intro", title: "¿Qué es la enajenación?" },
  { id: "actors", title: "Actores y tópicos" },
  { id: "flow", title: "Flujo en 7 pasos" },
  { id: "prerequisites", title: "Requisitos previos" },
  { id: "success-codes", title: "Códigos de éxito" },
  { id: "manual-test", title: "Prueba manual" },
] as const;

function DocSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-6">
      <h3 className="border-b border-border pb-2 text-base font-semibold text-card-foreground">
        {title}
      </h3>
      <div className="mt-4 space-y-3 text-sm text-muted">{children}</div>
    </section>
  );
}

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function EnajenacionMqttDocsPanel({
  showBackLink = false,
}: {
  showBackLink?: boolean;
}) {
  const [activeId, setActiveId] = useState<string>(
    ENAJENACION_DOC_SECTIONS[0].id,
  );
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = contentRef.current;
    if (!root) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target.id) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: "-20% 0px -55% 0px", threshold: [0, 0.25, 0.5] },
    );

    for (const section of ENAJENACION_DOC_SECTIONS) {
      const el = root.querySelector(`#${section.id}`);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, []);

  function handleNavClick(id: string) {
    setActiveId(id);
    setMobileNavOpen(false);
    scrollToSection(id);
  }

  const navButtons = ENAJENACION_DOC_SECTIONS.map((section) => (
    <button
      key={section.id}
      type="button"
      onClick={() => handleNavClick(section.id)}
      className={cn(
        "w-full rounded-lg px-3 py-2 text-left text-sm transition-colors",
        activeId === section.id
          ? "bg-accent/10 font-medium text-accent"
          : "text-muted hover:bg-foreground/5 hover:text-foreground",
      )}
    >
      {section.title}
    </button>
  ));

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      {showBackLink && (
        <div className="border-b border-border px-5 py-3">
          <Link
            href="/mqtt-tests"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Volver a herramientas MQTT
          </Link>
        </div>
      )}
      <div className="border-b border-border px-5 py-4">
        <h2 className="flex items-center gap-2 font-semibold text-card-foreground">
          <BookOpen className="size-5 text-accent" />
          Protocolo de enajenación automática (MQTT)
        </h2>
        <p className="mt-1 text-sm text-muted">
          Referencia operativa del flujo fiscal. Detalle completo en el backend:{" "}
          <code className="text-xs">docs/ENAJENACION_MQTT.md</code>.
        </p>
      </div>

      <div className="lg:grid lg:grid-cols-[14rem_minmax(0,1fr)]">
        <aside className="hidden border-r border-border p-4 lg:block">
          <p className="mb-2 px-3 text-xs font-medium uppercase tracking-wide text-muted">
            Contenido
          </p>
          <nav className="sticky top-4 space-y-0.5">{navButtons}</nav>
        </aside>

        <div className="border-b border-border p-4 lg:hidden">
          <button
            type="button"
            onClick={() => setMobileNavOpen((open) => !open)}
            className="inline-flex w-full items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium"
          >
            <span className="flex items-center gap-2">
              <List className="size-4" />
              Ir a sección
            </span>
            <span className="truncate text-muted">
              {ENAJENACION_DOC_SECTIONS.find((s) => s.id === activeId)?.title}
            </span>
          </button>
          {mobileNavOpen && (
            <nav className="mt-2 space-y-0.5 rounded-lg border border-border p-2">
              {navButtons}
            </nav>
          )}
        </div>

        <div ref={contentRef} className="space-y-10 p-5 lg:p-6">
          <DocSection id="intro" title="¿Qué es la enajenación?">
            <p>
              Transferir formalmente una impresora fiscal al{" "}
              <strong className="text-card-foreground">cliente</strong>{" "}
              (contribuyente final). En base de datos el estado pasa de{" "}
              <code className="text-xs">ASIGNADA</code> a{" "}
              <code className="text-xs">ENAJENADA</code>, conservando el{" "}
              <code className="text-xs">clientId</code>.
            </p>
            <p>
              Este protocolo automatiza el proceso que un distribuidor puede hacer
              hoy vía REST. Lo dispara la{" "}
              <strong className="text-card-foreground">impresora al arrancar</strong>{" "}
              cuando detecta que aún no está enajenada y tiene conectividad MQTT.
            </p>
          </DocSection>

          <DocSection id="actors" title="Actores y tópicos MQTT">
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <strong className="text-card-foreground">Impresora:</strong> inicia
                con <code className="text-xs">ptrEnajenar</code>, ejecuta comandos e
                imprime DNF, factura, NC y Reporte Z.
              </li>
              <li>
                <strong className="text-card-foreground">Broker MQTT:</strong>{" "}
                transporte pub/sub (p. ej. red privada en DigitalOcean).
              </li>
              <li>
                <strong className="text-card-foreground">AEG Core:</strong> valida
                BD, orquesta pasos 2–7 y persiste el resultado.
              </li>
            </ul>
            <p className="font-medium text-card-foreground">
              Tópicos (MAC sin &quot;:&quot;, 12 hex — ej.{" "}
              <code className="text-xs">206EF1884C68</code>):
            </p>
            <div className="overflow-x-auto rounded-lg border border-border bg-background p-3 font-mono text-xs text-card-foreground">
              <p>
                {"{mac}"}/AEG_Fiscal/Integracion/CmdServer ← impresora / respuestas
              </p>
              <p className="mt-1">
                {"{mac}"}/AEG_Fiscal/Integracion/Comando ← comandos del servidor
              </p>
            </div>
            <p>
              En el payload JSON la MAC usa formato con dos puntos (
              <code className="text-xs">20:6E:F1:88:4C:68</code>).
            </p>
          </DocSection>

          <DocSection id="flow" title="Flujo en 7 pasos">
            <ol className="space-y-4">
              {ENajenacionSteps.map((item) => (
                <li key={item.step} className="flex gap-3">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-semibold text-accent">
                    {item.step}
                  </span>
                  <div>
                    <p className="font-medium text-card-foreground">{item.name}</p>
                    <p className="text-xs">
                      {item.direction} · tópico{" "}
                      <code className="text-xs">{item.topic}</code>
                    </p>
                    <p className="mt-0.5">{item.summary}</p>
                  </div>
                </li>
              ))}
            </ol>
          </DocSection>

          <DocSection id="prerequisites" title="Requisitos previos en AEG Core (paso 1)">
            <ul className="list-disc space-y-1 pl-5">
              <li>
                Impresora existente con{" "}
                <code className="text-xs">fiscalSerial = ptrReg</code> y MAC
                coincidente con topic/payload.
              </li>
              <li>
                Estado <code className="text-xs">ASIGNADA</code> (no{" "}
                <code className="text-xs">ENAJENADA</code>).
              </li>
              <li>
                <code className="text-xs">clientId</code> asignado; cliente con
                sucursal, RIF, razón social y dirección completa.
              </li>
              <li>Sin otra sesión MQTT activa para la misma MAC.</li>
            </ul>
            <p>
              Si falla alguna validación, el servidor registra el error y no inicia
              el DNF.
            </p>
          </DocSection>

          <DocSection id="success-codes" title="Constantes de éxito (respuestas firmware)">
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-[20rem] text-left text-xs">
                <thead>
                  <tr className="border-b border-border bg-foreground/[0.03] text-muted">
                    <th className="py-2 pl-3 pr-3 font-medium">Comando</th>
                    <th className="py-2 pr-3 font-medium">code</th>
                    <th className="py-2 pr-3 font-medium">dataD</th>
                  </tr>
                </thead>
                <tbody className="text-card-foreground">
                  <tr className="border-b border-border/60">
                    <td className="py-2 pl-3 pr-3 font-mono">endDNF</td>
                    <td className="py-2 pr-3">0</td>
                    <td className="py-2 pr-3">7</td>
                  </tr>
                  <tr className="border-b border-border/60">
                    <td className="py-2 pl-3 pr-3 font-mono">subToF / endPoNC</td>
                    <td className="py-2 pr-3">0</td>
                    <td className="py-2 pr-3">555</td>
                  </tr>
                  <tr className="border-b border-border/60">
                    <td className="py-2 pl-3 pr-3 font-mono">endFac</td>
                    <td className="py-2 pr-3">0</td>
                    <td className="py-2 pr-3">8</td>
                  </tr>
                  <tr className="border-b border-border/60">
                    <td className="py-2 pl-3 pr-3 font-mono">prodNC (cada línea)</td>
                    <td className="py-2 pr-3">0</td>
                    <td className="py-2 pr-3">9</td>
                  </tr>
                  <tr className="border-b border-border/60">
                    <td className="py-2 pl-3 pr-3 font-mono">endNC</td>
                    <td className="py-2 pr-3">0</td>
                    <td className="py-2 pr-3">10</td>
                  </tr>
                  <tr>
                    <td className="py-2 pl-3 pr-3 font-mono">genImpRepZ</td>
                    <td className="py-2 pr-3">0</td>
                    <td className="py-2 pr-3">0</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p>
              Cualquier <code className="text-xs">code ≠ 0</code> aborta la sesión;
              la impresora no se marca enajenada.
            </p>
          </DocSection>

          <DocSection id="manual-test" title="Cómo usar la prueba manual">
            <ol className="list-decimal space-y-2 pl-5">
              <li>
                Elige una impresora{" "}
                <strong className="text-card-foreground">ASIGNADA</strong> con MAC
                y cliente válidos (pestaña Enajenación en Herramientas MQTT).
              </li>
              <li>
                Pulsa <strong className="text-card-foreground">Iniciar simulación</strong>:
                publica <code className="text-xs">ptrEnajenar</code> en CmdServer.
              </li>
              <li>
                Con <strong className="text-card-foreground">secuencia automática</strong>,
                el panel envía las respuestas de los pasos 2–7 vía{" "}
                <code className="text-xs">POST /api/mqtt/publish</code>.
              </li>
              <li>
                Usa el <strong className="text-card-foreground">monitor en vivo</strong>{" "}
                (tópico{" "}
                <code className="text-xs">{"{mac}"}/AEG_Fiscal/Integracion/#</code>)
                para ver tráfico entrante.
              </li>
              <li>
                Tras el Reporte Z, comprueba que el estado en BD pase a{" "}
                <strong className="text-card-foreground">Enajenada</strong>.
              </li>
            </ol>
            <p>
              Alternativa fuera del panel: script{" "}
              <code className="text-xs">
                scripts/enajenacion_printer_simulator.py
              </code>{" "}
              en aeg-core, conectado directamente al broker MQTT.
            </p>
          </DocSection>
        </div>
      </div>
    </div>
  );
}
