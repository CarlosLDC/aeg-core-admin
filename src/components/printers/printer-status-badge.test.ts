import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  PrinterStatusActionButton,
  PrinterStatusBadge,
} from "@/components/printers/printer-status-badge";
import {
  PRINTER_PENDING_MQTT_ENAJENACION_LABEL,
  PRINTER_PENDING_MQTT_ENAJENACION_TITLE,
} from "@/lib/printer-enajenacion-ticket";
import { printerStatusDescription } from "@/lib/printer-status";
import { PRINTER_STATUSES } from "@/types/printer";

describe("PrinterStatusBadge", () => {
  it("renders standard status label, color, and explanatory tooltip for every status", () => {
    for (const status of PRINTER_STATUSES) {
      const html = renderToStaticMarkup(
        createElement(PrinterStatusBadge, { status }),
      );
      expect(html).toContain(`title="${printerStatusDescription(status)}"`);
      expect(html).toContain("cursor-help");
    }

    const asignadaHtml = renderToStaticMarkup(
      createElement(PrinterStatusBadge, { status: "asignada" }),
    );
    expect(asignadaHtml).toContain(">Asignada<");
    expect(asignadaHtml).toContain("bg-emerald-500/10");
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

  it("preserves explicit title over default status or pendingMqtt title", () => {
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

describe("PrinterStatusActionButton", () => {
  it("uses the uniform blue accent style for every quick action kind", () => {
    const kinds = ["assign", "grant_dispose", "dispose", "reconfigure"] as const;
    for (const kind of kinds) {
      const html = renderToStaticMarkup(
        createElement(PrinterStatusActionButton, {
          action: {
            kind,
            buttonLabel: kind,
            label: kind,
            onClick: () => {},
          },
        }),
      );
      expect(html).toContain("border-accent/35 bg-accent/10 text-accent");
      expect(html).not.toContain("border-indigo-");
      expect(html).not.toContain("border-amber-");
    }
  });
});
