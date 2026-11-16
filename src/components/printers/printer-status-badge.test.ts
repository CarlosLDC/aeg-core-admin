import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PrinterStatusBadge } from "@/components/printers/printer-status-badge";
import {
  PRINTER_PENDING_MQTT_ENAJENACION_LABEL,
  PRINTER_PENDING_MQTT_ENAJENACION_TITLE,
} from "@/lib/printer-enajenacion-ticket";

describe("PrinterStatusBadge", () => {
  it("renders standard status label and color when pendingMqtt is false", () => {
    const html = renderToStaticMarkup(
      createElement(PrinterStatusBadge, { status: "asignada" }),
    );
    expect(html).toContain(">Asignada<");
    expect(html).toContain("bg-emerald-500/10");
  });

  it("renders the Enajenando... pseudo-status and amber style when pendingMqtt is true", () => {
    const html = renderToStaticMarkup(
      createElement(PrinterStatusBadge, {
        status: "asignada",
        pendingMqtt: true,
      }),
    );
    expect(html).toContain(`>${PRINTER_PENDING_MQTT_ENAJENACION_LABEL}<`);
    expect(html).toContain("bg-amber-500/10");
    expect(html).toContain(`title="${PRINTER_PENDING_MQTT_ENAJENACION_TITLE}"`);
    expect(html).not.toContain(">Asignada<");
  });

  it("preserves explicit title over default pendingMqtt title", () => {
    const html = renderToStaticMarkup(
      createElement(PrinterStatusBadge, {
        status: "asignada",
        pendingMqtt: true,
        title: "Detalle personalizado",
      }),
    );
    expect(html).toContain('title="Detalle personalizado"');
  });
});
