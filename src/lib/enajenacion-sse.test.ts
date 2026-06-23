import { describe, expect, it } from "vitest";
import {
  formatSseEventSummary,
  mergeAcceptedPrinterResponsesFromSse,
  mergeAcceptedStepsFromSse,
  mergeServerCommandsFromSse,
  parseEnajenacionSseMessage,
} from "@/lib/enajenacion-sse";
import type { EnajenacionSseEvent } from "@/types/enajenacion-sse";

describe("enajenacion-sse", () => {
  it("parses step_transition events", () => {
    const raw = JSON.stringify({
      type: "step_transition",
      mac: "206EF1884C68",
      at: "2026-06-17T10:00:00Z",
      acceptedStepId: "dnf",
      publishedStepId: "fiscal-rif",
      comandoTopic: "/206EF1884C68/AEG_Fiscal/Integracion/Comando",
      comandoPayload: "{\"cmd\":\"fiscalAEG\"}",
      sessionState: "FISCAL_RIF_SENT",
    });

    const event = parseEnajenacionSseMessage("step_transition", raw);
    expect(event?.type).toBe("step_transition");
    expect(event?.acceptedStepId).toBe("dnf");
    expect(event?.publishedStepId).toBe("fiscal-rif");
  });

  it("merges accepted steps from session_started and transitions", () => {
    const started: EnajenacionSseEvent = {
      type: "session_started",
      mac: "206EF1884C68",
      at: "2026-06-17T10:00:00Z",
      publishedStepId: "dnf",
      comandoTopic: "/206EF1884C68/AEG_Fiscal/Integracion/Comando",
      comandoPayload: "[]",
    };
    const transition: EnajenacionSseEvent = {
      type: "step_transition",
      mac: "206EF1884C68",
      at: "2026-06-17T10:00:01Z",
      acceptedStepId: "dnf",
      publishedStepId: "fiscal-rif",
      comandoTopic: "/206EF1884C68/AEG_Fiscal/Integracion/Comando",
      comandoPayload: "{\"cmd\":\"fiscalAEG\"}",
    };

    let done = mergeAcceptedStepsFromSse(new Set(), started);
    expect(done.has("request")).toBe(true);
    done = mergeAcceptedStepsFromSse(done, transition);
    expect(done.has("dnf")).toBe(true);
  });

  it("stores server commands by published step id", () => {
    const event: EnajenacionSseEvent = {
      type: "step_transition",
      mac: "206EF1884C68",
      at: "2026-06-17T10:00:01Z",
      publishedStepId: "fiscal-rif",
      comandoTopic: "/206EF1884C68/AEG_Fiscal/Integracion/Comando",
      comandoPayload: "{\"cmd\":\"fiscalAEG\"}",
    };

    const commands = mergeServerCommandsFromSse({}, event);
    expect(commands["fiscal-rif"]?.payload).toContain("fiscalAEG");
  });

  it("stores accepted printer responses by accepted step id", () => {
    const event: EnajenacionSseEvent = {
      type: "step_transition",
      mac: "206EF1884C68",
      at: "2026-06-17T10:00:01Z",
      acceptedStepId: "dnf",
      acceptedRespuestaTopic: "/206EF1884C68/AEG_Fiscal/Integracion/Respuesta",
      acceptedRespuestaPayload: "[{\"cmd\":\"endDNF\",\"code\":0}]",
      publishedStepId: "fiscal-rif",
      comandoTopic: "/206EF1884C68/AEG_Fiscal/Integracion/Comando",
      comandoPayload: "{\"cmd\":\"fiscalAEG\"}",
    };

    const responses = mergeAcceptedPrinterResponsesFromSse({}, event);
    expect(responses.dnf?.payload).toContain("endDNF");
    expect(responses.dnf?.topic).toContain("Respuesta");
  });

  it("formats SSE event summaries", () => {
    expect(
      formatSseEventSummary({
        type: "step_transition",
        mac: "206EF1884C68",
        at: "2026-06-17T10:00:01Z",
        acceptedStepId: "dnf",
        publishedStepId: "fiscal-rif",
      }),
    ).toContain("dnf");
  });
});
