import { describe, expect, it } from "vitest";
import {
  formatPrinterTicketSectionJson,
  hasPrinterTicketConfig,
  isPrinterPendingMqttEnajenacion,
} from "@/lib/printer-enajenacion-ticket";
import type { PrinterResponse } from "@/types/printer";

function printer(
  partial: Partial<PrinterResponse> & Pick<PrinterResponse, "status">,
): PrinterResponse {
  return {
    id: 1,
    modelId: 1,
    softwareId: null,
    clientId: null,
    fiscalSerial: "GRA0000001",
    finalSalePrice: null,
    createdAt: "2026-01-01T00:00:00Z",
    distributorId: 1,
    paid: true,
    installationDate: null,
    versionFirmware: null,
    macAddress: null,
    deviceType: "interno",
    header: null,
    trailer: null,
    ...partial,
  };
}

describe("printer-enajenacion-ticket", () => {
  it("detects saved ticket configuration", () => {
    expect(hasPrinterTicketConfig(printer({ header: { lines: ["LINEA"] } }))).toBe(
      true,
    );
    expect(hasPrinterTicketConfig(printer({ header: { lines: [] } }))).toBe(
      false,
    );
  });

  it("flags printers waiting for Remoto enajenacion", () => {
    expect(
      isPrinterPendingMqttEnajenacion(
        printer({
          status: "asignada",
          clientId: 10,
          header: { lines: ["ENCABEZADO"] },
        }),
      ),
    ).toBe(true);

    expect(
      isPrinterPendingMqttEnajenacion(
        printer({
          status: "enajenada",
          clientId: 10,
          header: { lines: ["ENCABEZADO"] },
        }),
      ),
    ).toBe(false);
  });

  it("formats ticket JSON for preview", () => {
    expect(formatPrinterTicketSectionJson({ lines: ["A", "B"] })).toBe(
      '{\n  "lines": [\n    "A",\n    "B"\n  ]\n}',
    );
  });
});
