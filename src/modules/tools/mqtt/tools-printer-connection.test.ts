import { describe, expect, it } from "vitest";
import {
  isToolsPrinterConnectionKnown,
  isToolsPrinterOnline,
} from "@/modules/tools/mqtt/tools-printer-connection";

describe("isToolsPrinterOnline", () => {
  it("returns true only when SENIAT reports EN LINEA without errors", () => {
    expect(
      isToolsPrinterOnline(
        { success: true, seniatStatus: "EN LINEA" },
        null,
      ),
    ).toBe(true);
    expect(
      isToolsPrinterOnline(
        { success: true, seniatStatus: "SIN CONEXION" },
        null,
      ),
    ).toBe(false);
    expect(isToolsPrinterOnline(null, "Sin respuesta")).toBe(false);
    expect(
      isToolsPrinterOnline({ success: false, seniatStatus: "EN LINEA" }, null),
    ).toBe(false);
  });
});

describe("isToolsPrinterConnectionKnown", () => {
  it("waits for the first status response before treating connection as known", () => {
    expect(isToolsPrinterConnectionKnown(true, null, null)).toBe(false);
    expect(
      isToolsPrinterConnectionKnown(
        true,
        { success: true, seniatStatus: "SIN CONEXION" },
        null,
      ),
    ).toBe(true);
    expect(isToolsPrinterConnectionKnown(false, null, "Error")).toBe(true);
  });
});
