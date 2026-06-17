import {
  ENAJENACION_FLOW_STEPS,
  EnajenacionCommandSteps,
  buildPrinterSimulationPayload,
  formatMqttPayloadForDisplay,
  type EnajenacionCommandContext,
} from "@/lib/enajenacion-mqtt-protocol";
import type { EnajenacionSseServerCommand } from "@/types/enajenacion-sse";

export type EnajenacionTrafficMessage = {
  topic: string;
  payload: string;
};

export type EnajenacionTrafficTopics = {
  mac: string;
  cmdServer: string;
  comando: string;
  monitor: string;
};

export type EnajenacionTrafficEntry = {
  stepId: string;
  step: string;
  name: string;
  direction: string;
  printerMessage: EnajenacionTrafficMessage | null;
  serverMessage: EnajenacionTrafficMessage | null;
  serverOrigin: "template" | "live" | null;
};

function serializePayload(payload: unknown): string {
  return formatMqttPayloadForDisplay(JSON.stringify(payload));
}

export function buildEnajenacionTrafficCatalog(params: {
  commandContext: EnajenacionCommandContext;
  macAddress: string;
  topics: EnajenacionTrafficTopics;
  liveServerCommands?: Record<string, EnajenacionSseServerCommand>;
}): EnajenacionTrafficEntry[] {
  const { commandContext, macAddress, topics, liveServerCommands } = params;

  return ENAJENACION_FLOW_STEPS.map((flow) => {
    const simulation = buildPrinterSimulationPayload(
      flow.id,
      commandContext,
      macAddress,
      topics.cmdServer,
    );

    const printerMessage: EnajenacionTrafficMessage = {
      topic: simulation.topic,
      payload: serializePayload(simulation.payload),
    };

    if (flow.id === "request") {
      return {
        stepId: flow.id,
        step: flow.step,
        name: flow.name,
        direction: flow.direction,
        printerMessage,
        serverMessage: null,
        serverOrigin: null,
      };
    }

    const liveCommand = liveServerCommands?.[flow.id];
    if (liveCommand) {
      return {
        stepId: flow.id,
        step: flow.step,
        name: flow.name,
        direction: flow.direction,
        printerMessage,
        serverMessage: {
          topic: liveCommand.topic,
          payload: formatMqttPayloadForDisplay(liveCommand.payload),
        },
        serverOrigin: "live",
      };
    }

    const commandStep = EnajenacionCommandSteps.find(
      (step) => step.flowStepId === flow.id,
    );
    const serverPayload = commandStep?.buildPayload(commandContext);

    return {
      stepId: flow.id,
      step: flow.step,
      name: flow.name,
      direction: flow.direction,
      printerMessage,
      serverMessage: serverPayload
        ? {
            topic: topics.comando,
            payload: serializePayload(serverPayload),
          }
        : null,
      serverOrigin: serverPayload ? "template" : null,
    };
  });
}

export function formatEnajenacionTrafficExport(
  topics: EnajenacionTrafficTopics,
  catalog: EnajenacionTrafficEntry[],
): string {
  const lines: string[] = [
    "# Tráfico MQTT — Enajenación",
    "",
    "## Tópicos",
    `CmdServer: ${topics.cmdServer}`,
    `Comando: ${topics.comando}`,
    `Monitor: ${topics.monitor}`,
    "",
  ];

  for (const entry of catalog) {
    lines.push(`## Paso ${entry.step} — ${entry.name}`);
    lines.push(`Dirección: ${entry.direction}`);
    lines.push("");

    if (entry.printerMessage) {
      lines.push("### Impresora (CmdServer)");
      lines.push(`Tópico: ${entry.printerMessage.topic}`);
      lines.push("Payload:");
      lines.push(entry.printerMessage.payload);
      lines.push("");
    }

    if (entry.serverMessage) {
      const origin =
        entry.serverOrigin === "live" ? " (en vivo)" : " (plantilla)";
      lines.push(`### Servidor (Comando)${origin}`);
      lines.push(`Tópico: ${entry.serverMessage.topic}`);
      lines.push("Payload:");
      lines.push(entry.serverMessage.payload);
      lines.push("");
    }
  }

  return lines.join("\n");
}
