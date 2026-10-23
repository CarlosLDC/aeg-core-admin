import { describe, expect, it } from "vitest";
import {
  canReconfigurePrinterTicket,
  formatPrinterTicketSectionJson,
  hasPrinterTicketConfig,
  isPrinterPendingMqttEnajenacion,
} from "@/lib/printer-enajenacion-ticket";
import type { PrinterResponse } from "@/types/printer";

function printer(partial: Partial<PrinterResponse>): PrinterResponse {
  return {
    id: 1,
    modelId: 1,
    softwareId: null,
    clientId: null,
    fiscalSerial: "GRA0000001",
    finalSalePrice: null,
    createdAt: "2026-01-01T00:00:00Z",
    distributorId: 1,
    creationBatchId: null,
    status: "sin_asignar",
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
    // Listado liviano: sin header, pero con el flag del backend.
    expect(
      hasPrinterTicketConfig(printer({ header: null, hasTicketConfig: true })),
    ).toBe(true);
    expect(
      hasPrinterTicketConfig(printer({ header: null, hasTicketConfig: false })),
    ).toBe(false);
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

  it("allows ticket reconfiguration for pending MQTT and disposed printers", () => {
    expect(
      canReconfigurePrinterTicket(
        printer({
          status: "asignada",
          clientId: 10,
          header: { lines: ["ENCABEZADO"] },
        }),
      ),
    ).toBe(true);

    expect(
      canReconfigurePrinterTicket(
        printer({
          status: "enajenada",
          clientId: 10,
          header: { lines: ["ENCABEZADO"] },
        }),
      ),
    ).toBe(true);

    expect(
      canReconfigurePrinterTicket(
        printer({
          status: "asignada",
          clientId: 10,
          header: null,
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
