import { describe, expect, it } from "vitest";
import {
  buildToolsPdfFilename,
  getToolsPdfTypeLabel,
} from "./tools-pdf-shared";
import { createToolsPdfBuffer, countPdfPages } from "./tools-pdf-server";

describe("tools-pdf-shared", () => {
  it("resuelve etiquetas por tipo de documento", () => {
    expect(getToolsPdfTypeLabel("FAC")).toBe("Factura");
    expect(getToolsPdfTypeLabel("Z")).toBe("ReporteZ");
  });

  it("construye nombres de archivo seguros", () => {
    expect(buildToolsPdfFilename("Factura", "GRA/001", 12)).toBe(
      "Factura_12_GRA-001.pdf",
    );
  });
});

describe("tools-pdf-server", () => {
  it("genera un buffer PDF para contenido ESC/POS", async () => {
    const buffer = await createToolsPdfBuffer({
      rawContent: "!a1!TITULO DE PRUEBA\nLinea 2",
      documentType: "FAC",
      printerSerial: "GRA0000017",
      documentNumber: 1,
    });

    expect(buffer.byteLength).toBeGreaterThan(100);
    expect(buffer.subarray(0, 4).toString("ascii")).toBe("%PDF");
  });

  it("genera reporte X en una sola pagina aunque tenga muchas lineas con montos", async () => {
    const lines = Array.from(
      { length: 80 },
      (_, index) => `Concepto fiscal numero ${index + 1} extendido Bs ${(index + 1) * 10}.00`,
    );
    const buffer = await createToolsPdfBuffer({
      rawContent: ["!a1!REPORTE X", ...lines].join("\n"),
      documentType: "reporte-x",
      printerSerial: "GRA0000017",
      documentNumber: 0,
    });

    expect(countPdfPages(buffer)).toBe(1);
  });
});
