import { describe, expect, it } from "vitest";
import { ApiError } from "@/types/auth";
import {
  TOOLS_FISCAL_ERROR_Z_NOT_FOUND,
  getToolsReportZErrorMessage,
} from "@/lib/tools-mqtt-api";

describe("getToolsReportZErrorMessage", () => {
  it("traduce el código fiscal 48 a un mensaje amigable", () => {
    expect(
      getToolsReportZErrorMessage(
        new ApiError("Reporte no encontrado", 400, TOOLS_FISCAL_ERROR_Z_NOT_FOUND),
        125,
      ),
    ).toBe("No existe un reporte Z con el número 125.");
  });

  it("detecta el código 48 en el mensaje remoto", () => {
    expect(
      getToolsReportZErrorMessage(new ApiError("Error fiscal 48", 400), 88),
    ).toBe("No existe un reporte Z con el número 88.");
  });

  it("conserva otros errores sin traducir", () => {
    expect(
      getToolsReportZErrorMessage(new ApiError("Impresora ocupada", 409), 10),
    ).toBe("Impresora ocupada");
  });
});
