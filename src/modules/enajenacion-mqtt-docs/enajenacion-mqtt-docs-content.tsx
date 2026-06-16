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
      "wFileSPIFF → paramFacSPIFF.json (dirección, ciudad, tipo de contribuyente y pie fijo opcional).",
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
    direction: "Servidor → impresora",
    topic: "Comando",
    summary:
      "StaInf con data.status = NroRegMa. Respuesta en CmdServer: code 0 y dataS = ptrReg (ej. GRA0000017).",
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

export function EnajenacionMqttDocsContent() {
  return (
    <article className="mx-auto max-w-3xl px-6 py-12 sm:px-8 lg:py-16">
      <header className="mb-14">
        <p className="text-sm font-medium uppercase tracking-wide text-muted">
          AEG Core · Referencia técnica
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Protocolo de enajenación automática (MQTT)
        </h1>
        <P>
          Flujo fiscal entre impresora, broker MQTT y AEG Core. Detalle completo
          en el repositorio backend: <Code>docs/ENAJENACION_MQTT.md</Code>.
        </P>
      </header>

      <div className="space-y-14">
        <Section id="intro" title="¿Qué es la enajenación?">
          <P>
            Transferir formalmente una impresora fiscal al{" "}
            <strong className="font-semibold text-foreground">cliente</strong>{" "}
            (contribuyente final). En base de datos el estado pasa de{" "}
            <Code>ASIGNADA</Code> a <Code>ENAJENADA</Code>, conservando el{" "}
            <Code>clientId</Code>.
          </P>
          <P>
            Este protocolo automatiza el proceso que un distribuidor puede hacer
            hoy vía REST. Lo dispara la{" "}
            <strong className="font-semibold text-foreground">
              impresora al arrancar
            </strong>{" "}
            cuando detecta que aún no está enajenada y tiene conectividad MQTT.
          </P>
        </Section>

        <Section id="actors" title="Actores y tópicos MQTT">
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong className="font-semibold text-foreground">Impresora:</strong>{" "}
              inicia con <Code>ptrEnajenar</Code>, ejecuta comandos e imprime
              DNF, factura, NC y Reporte Z.
            </li>
            <li>
              <strong className="font-semibold text-foreground">Broker MQTT:</strong>{" "}
              transporte pub/sub (p. ej. red privada en DigitalOcean).
            </li>
            <li>
              <strong className="font-semibold text-foreground">AEG Core:</strong>{" "}
              valida BD, orquesta pasos 2–7 y persiste el resultado.
            </li>
          </ul>
          <P>
            <strong className="font-semibold text-foreground">
              Tópicos
            </strong>{" "}
            (MAC sin &quot;:&quot;, 12 hex — ej. <Code>206EF1884C68</Code>):
          </P>
          <pre className="overflow-x-auto rounded-lg bg-foreground/[0.04] p-4 font-mono text-sm text-foreground">
            /{"{mac}"}/AEG_Fiscal/Integracion/CmdServer ← impresora / respuestas{"\n"}
            /{"{mac}"}/AEG_Fiscal/Integracion/Comando ← comandos del servidor
          </pre>
          <P>
            En el payload JSON la MAC usa formato con dos puntos (
            <Code>20:6E:F1:88:4C:68</Code>).
          </P>
        </Section>

        <Section id="flow" title="Flujo en 7 pasos">
          <ol className="space-y-6">
            {ENajenacionSteps.map((item) => (
              <li key={item.step} className="flex gap-4">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent/15 text-sm font-semibold text-accent">
                  {item.step}
                </span>
                <div>
                  <p className="font-semibold text-foreground">{item.name}</p>
                  <p className="mt-0.5 text-sm">
                    {item.direction} · tópico <Code>{item.topic}</Code>
                  </p>
                  <p className="mt-1">{item.summary}</p>
                </div>
              </li>
            ))}
          </ol>
        </Section>

        <Section id="prerequisites" title="Requisitos previos en AEG Core (paso 1)">
          <ul className="list-disc space-y-2 pl-5">
            <li>
              Impresora existente con <Code>fiscalSerial = ptrReg</Code> y MAC
              coincidente con topic/payload.
            </li>
            <li>
              Estado <Code>ASIGNADA</Code> o <Code>LABORATORIO</Code> (no{" "}
              <Code>ENAJENADA</Code>).
            </li>
            <li>
              <Code>clientId</Code> asignado; cliente con sucursal, RIF, razón
              social y dirección completa.
            </li>
            <li>Sin otra sesión MQTT activa para la misma MAC.</li>
          </ul>
          <P>
            Si falla alguna validación, el servidor registra el error y no inicia
            el DNF.
          </P>
        </Section>

        <Section id="success-codes" title="Constantes de éxito (respuestas firmware)">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[20rem] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-muted">
                  <th className="py-2 pr-4 font-medium">Comando</th>
                  <th className="py-2 pr-4 font-medium">code</th>
                  <th className="py-2 font-medium">dataD</th>
                </tr>
              </thead>
              <tbody className="text-foreground">
                <tr className="border-b border-border/60">
                  <td className="py-2 pr-4 font-mono">endDNF</td>
                  <td className="py-2 pr-4">0</td>
                  <td className="py-2">7</td>
                </tr>
                <tr className="border-b border-border/60">
                  <td className="py-2 pr-4 font-mono">subToF / endPoNC</td>
                  <td className="py-2 pr-4">0</td>
                  <td className="py-2">555</td>
                </tr>
                <tr className="border-b border-border/60">
                  <td className="py-2 pr-4 font-mono">endFac</td>
                  <td className="py-2 pr-4">0</td>
                  <td className="py-2">8</td>
                </tr>
                <tr className="border-b border-border/60">
                  <td className="py-2 pr-4 font-mono">prodNC (cada línea)</td>
                  <td className="py-2 pr-4">0</td>
                  <td className="py-2">9</td>
                </tr>
                <tr className="border-b border-border/60">
                  <td className="py-2 pr-4 font-mono">endNC</td>
                  <td className="py-2 pr-4">0</td>
                  <td className="py-2">10</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-mono">genImpRepZ</td>
                  <td className="py-2 pr-4">0</td>
                  <td className="py-2">0</td>
                </tr>
              </tbody>
            </table>
          </div>
          <P>
            Cualquier <Code>code ≠ 0</Code> aborta la sesión; la impresora no se
            marca enajenada.
          </P>
        </Section>

        <Section id="manual-test" title="Cómo usar la prueba manual">
          <ol className="list-decimal space-y-3 pl-5">
            <li>
              Elige una impresora{" "}
              <strong className="font-semibold text-foreground">ASIGNADA</strong>{" "}
              con MAC y cliente válidos (Herramientas MQTT → Enajenación).
            </li>
            <li>
              Pulsa{" "}
              <strong className="font-semibold text-foreground">
                Iniciar simulación
              </strong>
              : publica <Code>ptrEnajenar</Code> en CmdServer.
            </li>
            <li>
              Con{" "}
              <strong className="font-semibold text-foreground">
                secuencia automática
              </strong>
              , el panel envía las respuestas de los pasos 2–7 vía{" "}
              <Code>POST /api/mqtt/publish</Code>.
            </li>
            <li>
              Usa el{" "}
              <strong className="font-semibold text-foreground">
                monitor en vivo
              </strong>{" "}
              (tópico <Code>{"{mac}"}/AEG_Fiscal/Integracion/#</Code>) para ver
              tráfico entrante.
            </li>
            <li>
              Tras el Reporte Z, comprueba que el estado en BD pase a{" "}
              <strong className="font-semibold text-foreground">Enajenada</strong>.
            </li>
          </ol>
          <P>
            Alternativa fuera del panel: script{" "}
            <Code>scripts/enajenacion_printer_simulator.py</Code> en aeg-core,
            conectado directamente al broker MQTT.
          </P>
        </Section>
      </div>

      <footer className="mt-16 border-t border-border pt-8 text-sm text-muted">
        Alpha Engineer Group · Documentación interna
      </footer>
    </article>
  );
}
