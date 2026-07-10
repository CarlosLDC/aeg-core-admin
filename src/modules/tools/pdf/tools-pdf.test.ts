import { describe, expect, it } from "vitest";
import {
  buildToolsPdfFilename,
  createToolsPdfBuffer,
  getToolsPdfTypeLabel,
} from "./tools-pdf";

describe("tools-pdf", () => {
  it("resuelve etiquetas por tipo de documento", () => {
    expect(getToolsPdfTypeLabel("FAC")).toBe("Factura");
    expect(getToolsPdfTypeLabel("Z")).toBe("ReporteZ");
  });

  it("construye nombres de archivo seguros", () => {
    expect(buildToolsPdfFilename("Factura", "GRA/001", 12)).toBe(
      "Factura_12_GRA-001.pdf",
    );
  });

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
});
