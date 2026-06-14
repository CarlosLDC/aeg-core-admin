"use client";

import type { ReactNode } from "react";
import { BookOpen, ChevronDown } from "lucide-react";
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

function DocDetails({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details
      open={defaultOpen}
      className="group rounded-lg border border-border bg-foreground/[0.02]"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-medium text-card-foreground [&::-webkit-details-marker]:hidden">
        {title}
        <ChevronDown className="size-4 shrink-0 text-muted transition-transform group-open:rotate-180" />
      </summary>
      <div className="border-t border-border px-4 py-3 text-sm text-muted">
        {children}
      </div>
    </details>
  );
}

export function EnajenacionMqttDocsPanel() {
  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <h2 className="flex items-center gap-2 font-semibold text-card-foreground">
        <BookOpen className="size-5 text-accent" />
        Protocolo de enajenación automática (MQTT)
      </h2>
      <p className="mt-1 text-sm text-muted">
        Referencia operativa del flujo fiscal entre impresora, broker MQTT y AEG
        Core. Detalle técnico completo en el repositorio backend:{" "}
        <code className="text-xs">docs/ENAJENACION_MQTT.md</code>.
      </p>

      <div className="mt-5 space-y-3">
        <DocDetails title="¿Qué es la enajenación?" defaultOpen>
          <p>
            Transferir formalmente una impresora fiscal al{" "}
            <strong>cliente</strong> (contribuyente final). En base de datos el
            estado pasa de <code className="text-xs">ASIGNADA</code> a{" "}
            <code className="text-xs">ENAJENADA</code>, conservando el{" "}
            <code className="text-xs">clientId</code>.
          </p>
          <p className="mt-2">
            Este protocolo automatiza el proceso que un distribuidor puede hacer
            hoy vía REST. Lo dispara la <strong>impresora al arrancar</strong>{" "}
            cuando detecta que aún no está enajenada y tiene conectividad MQTT.
          </p>
        </DocDetails>

        <DocDetails title="Actores y tópicos MQTT">
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong>Impresora:</strong> inicia con{" "}
              <code className="text-xs">ptrEnajenar</code>, ejecuta comandos e
              imprime DNF, factura, NC y Reporte Z.
            </li>
            <li>
              <strong>Broker MQTT:</strong> transporte pub/sub (p. ej. red
              privada en DigitalOcean).
            </li>
            <li>
              <strong>AEG Core:</strong> valida BD, orquesta pasos 2–7 y persiste
              el resultado.
            </li>
          </ul>
          <p className="mt-3 font-medium text-card-foreground">
            Tópicos (MAC sin &quot;:&quot;, 12 hex — ej.{" "}
            <code className="text-xs">206EF1884C68</code>):
          </p>
          <div className="mt-2 overflow-x-auto rounded-lg border border-border bg-background p-3 font-mono text-xs text-card-foreground">
            <p>
              {"{mac}"}/AEG_Fiscal/Integracion/CmdServer ← impresora / respuestas
            </p>
            <p className="mt-1">
              {"{mac}"}/AEG_Fiscal/Integracion/Comando ← comandos del servidor
            </p>
          </div>
          <p className="mt-2">
            En el payload JSON la MAC usa formato con dos puntos (
            <code className="text-xs">20:6E:F1:88:4C:68</code>).
          </p>
        </DocDetails>

        <DocDetails title="Flujo en 7 pasos">
          <ol className="space-y-3">
            {ENajenacionSteps.map((item) => (
              <li key={item.step} className="flex gap-3">
                <span
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-semibold text-accent",
                  )}
                >
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
        </DocDetails>

        <DocDetails title="Requisitos previos en AEG Core (paso 1)">
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
          <p className="mt-2">
            Si falla alguna validación, el servidor registra el error y no inicia
            el DNF.
          </p>
        </DocDetails>

        <DocDetails title="Constantes de éxito (respuestas firmware)">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[20rem] text-left text-xs">
              <thead>
                <tr className="border-b border-border text-muted">
                  <th className="py-1.5 pr-3 font-medium">Comando</th>
                  <th className="py-1.5 pr-3 font-medium">code</th>
                  <th className="py-1.5 font-medium">dataD</th>
                </tr>
              </thead>
              <tbody className="text-card-foreground">
                <tr className="border-b border-border/60">
                  <td className="py-1.5 pr-3 font-mono">endDNF</td>
                  <td className="py-1.5 pr-3">0</td>
                  <td className="py-1.5">7</td>
                </tr>
                <tr className="border-b border-border/60">
                  <td className="py-1.5 pr-3 font-mono">subToF / endPoNC</td>
                  <td className="py-1.5 pr-3">0</td>
                  <td className="py-1.5">555</td>
                </tr>
                <tr className="border-b border-border/60">
                  <td className="py-1.5 pr-3 font-mono">endFac</td>
                  <td className="py-1.5 pr-3">0</td>
                  <td className="py-1.5">8</td>
                </tr>
                <tr className="border-b border-border/60">
                  <td className="py-1.5 pr-3 font-mono">prodNC (cada línea)</td>
                  <td className="py-1.5 pr-3">0</td>
                  <td className="py-1.5">9</td>
                </tr>
                <tr className="border-b border-border/60">
                  <td className="py-1.5 pr-3 font-mono">endNC</td>
                  <td className="py-1.5 pr-3">0</td>
                  <td className="py-1.5">10</td>
                </tr>
                <tr>
                  <td className="py-1.5 pr-3 font-mono">genImpRepZ</td>
                  <td className="py-1.5 pr-3">0</td>
                  <td className="py-1.5">0</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-2">
            Cualquier <code className="text-xs">code ≠ 0</code> aborta la sesión;
            la impresora no se marca enajenada.
          </p>
        </DocDetails>

        <DocDetails title="Cómo usar la prueba manual de abajo">
          <ol className="list-decimal space-y-2 pl-5">
            <li>
              Elige una impresora <strong>ASIGNADA</strong> con MAC y cliente
              válidos.
            </li>
            <li>
              Pulsa <strong>Iniciar simulación</strong>: publica{" "}
              <code className="text-xs">ptrEnajenar</code> en CmdServer (como
              haría el firmware al encender).
            </li>
            <li>
              Con <strong>secuencia automática</strong>, el panel envía las
              respuestas de los pasos 2–7 en CmdServer vía{" "}
              <code className="text-xs">POST /api/mqtt/publish</code>.
            </li>
            <li>
              Usa el <strong>monitor en vivo</strong> (tópico{" "}
              <code className="text-xs">{"{mac}"}/AEG_Fiscal/Integracion/#</code>
              ) para ver tráfico entrante al servidor.
            </li>
            <li>
              Tras el Reporte Z, comprueba que el estado en BD pase a{" "}
              <strong>Enajenada</strong> (botón Actualizar estado).
            </li>
          </ol>
          <p className="mt-2">
            Alternativa fuera del panel: script{" "}
            <code className="text-xs">
              scripts/enajenacion_printer_simulator.py
            </code>{" "}
            en aeg-core, conectado directamente al broker MQTT.
          </p>
        </DocDetails>
      </div>
    </section>
  );
}
