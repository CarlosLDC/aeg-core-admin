import {
  buildFooterReadPayload,
  buildFooterWritePayload,
  buildFormasPagoReadPayload,
  buildFormasPagoWritePayload,
  buildGenerateReportZPayload,
  buildGetReportZPayload,
  buildHeaderReadPayload,
  buildHeaderWritePayload,
  buildLastTransmittedZPayload,
  buildListReportZPayload,
  buildReportXPayload,
  buildReprintPayload,
  buildStatusPayload,
  buildTestCreditNotePayloads,
  buildTestDebitNotePayloads,
  buildTestGenerateZPayloads,
  buildTestInvoicePayloads,
  buildWifiConnectPayload,
  buildWifiResetPayload,
  buildWifiScanPayload,
  mapReprintTipoRe,
} from "@/modules/tools/serial/tools-command-builder";
import {
  FOOTER_MAX_LINES,
  HEADER_MAX_LINES,
  parseHeaderFooterLines,
  validateHeaderFooterLines,
} from "@/modules/tools/serial/tools-header-footer-payload";
import type { ToolsSerialPortSession } from "@/modules/tools/serial/tools-serial-port";
import {
  CMD_DESC_FP,
  CMD_END_FAC,
  CMD_END_NC,
  CMD_END_ND,
  CMD_GEN_IMP_REP_Z,
  CMD_GET_REP_Z,
  CMD_IMP_REP_X,
  CMD_PIE_TI_F,
  CMD_REIM_REP,
  CMD_REP_Z,
  CMD_W_FILE_SPIFF,
  CMD_WIFI_CONF,
  TOOLS_SERIAL_TIMEOUT_MS,
} from "@/modules/tools/serial/tools-serial-constants";
import {
  isFormasPagoResponse,
  isHeaderFooterReadResponse,
  isLastTransmittedZResponse,
  isStatusResponse,
  isWifiScanResponse,
  parseFormasPagoResponse,
  parseHeaderFooterResponse,
  parseReportZResponse,
  parseReprintChunks,
  parseSimpleAck,
  parseStatusResponse,
  parseTransmitZResponse,
  parseWifiConnectResponse,
  parseWifiScanResponse,
} from "@/modules/tools/serial/tools-response-parser";
import type { ToolsPrinterTransport } from "@/modules/tools/transport/tools-printer-transport";

export function createUsbSerialTransport(
  session: ToolsSerialPortSession,
): ToolsPrinterTransport {
  const requireConnected = () => {
    if (!session.isConnected) {
      throw new Error("Conecte la impresora por USB antes de continuar.");
    }
  };

  return {
    mode: "usb",
    get isReady() {
      return session.isConnected;
    },
    connectionLabel: "USB",

    disconnect: () => session.close(),

    fetchStatus: async () => {
      requireConnected();
      const response = await session.publishAndAwaitMatcher(
        buildStatusPayload(),
        isStatusResponse,
        TOOLS_SERIAL_TIMEOUT_MS.status,
      );
      return parseStatusResponse(response);
    },

    scanWifi: async () => {
      requireConnected();
      const response = await session.publishAndAwaitMatcher(
        buildWifiScanPayload(),
        isWifiScanResponse,
        TOOLS_SERIAL_TIMEOUT_MS.wifiScan,
      );
      return {
        success: true,
        networks: parseWifiScanResponse(response),
      };
    },

    connectWifi: async (ssid, password) => {
      requireConnected();
      const response = await session.publishAndAwaitObject(
        buildWifiConnectPayload(ssid, password),
        CMD_WIFI_CONF,
        TOOLS_SERIAL_TIMEOUT_MS.wifi,
      );
      parseWifiConnectResponse(response);
      return { success: true, message: "Conexión WiFi enviada correctamente." };
    },

    resetWifi: async () => {
      requireConnected();
      await session.publishFireAndForget(buildWifiResetPayload());
      return { success: true, message: "Comando de reinicio enviado a la impresora." };
    },

    listReportZ: async () => {
      requireConnected();
      const response = await session.publishAndAwaitObject(
        buildListReportZPayload(),
        CMD_GET_REP_Z,
        TOOLS_SERIAL_TIMEOUT_MS.reportZ,
      );
      return { success: true, report: parseReportZResponse(response) };
    },

    generateReportZ: async () => {
      requireConnected();
      const response = await session.publishAndAwaitObject(
        buildGenerateReportZPayload(),
        CMD_REP_Z,
        TOOLS_SERIAL_TIMEOUT_MS.reportZ,
      );
      return { success: true, report: parseReportZResponse(response) };
    },

    getReportZ: async (reportNumber) => {
      requireConnected();
      const response = await session.publishAndAwaitObject(
        buildGetReportZPayload(reportNumber),
        CMD_GET_REP_Z,
        TOOLS_SERIAL_TIMEOUT_MS.reportZ,
      );
      return { success: true, report: parseReportZResponse(response) };
    },

    transmitReportZ: async () => {
      requireConnected();
      const response = await session.publishAndAwaitMatcher(
        buildLastTransmittedZPayload(),
        isLastTransmittedZResponse,
        TOOLS_SERIAL_TIMEOUT_MS.reportZ,
      );
      return parseTransmitZResponse(response);
    },

    sendReportX: async () => {
      requireConnected();
      const result = await session.publishAndAwaitTextChunks(
        buildReportXPayload(),
        CMD_IMP_REP_X,
        TOOLS_SERIAL_TIMEOUT_MS.reprint,
      );
      if (result.terminal.code != null && result.terminal.code !== 0) {
        throw new Error(
          `La impresora rechazó la generación del reporte X (código ${result.terminal.code}).`,
        );
      }
      const escPos = parseReprintChunks(result.chunks);
      if (escPos === "") {
        throw new Error("La impresora no devolvió contenido del reporte X.");
      }
      return { success: true, escPosContent: escPos };
    },

    readFormasPago: async () => {
      requireConnected();
      const response = await session.publishAndAwaitMatcher(
        buildFormasPagoReadPayload(),
        isFormasPagoResponse,
        TOOLS_SERIAL_TIMEOUT_MS.formasPago,
      );
      return { success: true, formasPago: parseFormasPagoResponse(response) };
    },

    writeFormasPago: async (nroFP, descripcion) => {
      requireConnected();
      const response = await session.publishAndAwaitObject(
        buildFormasPagoWritePayload(nroFP, descripcion),
        CMD_DESC_FP,
        TOOLS_SERIAL_TIMEOUT_MS.formasPago,
      );
      parseSimpleAck(response, "Error al actualizar forma de pago");
      return { success: true, message: "Forma de pago actualizada." };
    },

    readHeader: async () => {
      requireConnected();
      const response = await session.publishAndAwaitMatcher(
        buildHeaderReadPayload(),
        isHeaderFooterReadResponse,
        TOOLS_SERIAL_TIMEOUT_MS.default,
      );
      return { success: true, content: parseHeaderFooterResponse(response) };
    },

    writeHeader: async (content) => {
      requireConnected();
      const lines = parseHeaderFooterLines(content);
      validateHeaderFooterLines(lines, HEADER_MAX_LINES, "encabezado");
      const response = await session.publishAndAwaitObject(
        buildHeaderWritePayload(content),
        CMD_W_FILE_SPIFF,
        TOOLS_SERIAL_TIMEOUT_MS.default,
      );
      parseSimpleAck(response, "Error al escribir encabezado");
      return { success: true, message: "Encabezado actualizado." };
    },

    readFooter: async () => {
      requireConnected();
      const response = await session.publishAndAwaitMatcher(
        buildFooterReadPayload(),
        isHeaderFooterReadResponse,
        TOOLS_SERIAL_TIMEOUT_MS.default,
      );
      return { success: true, content: parseHeaderFooterResponse(response) };
    },

    writeFooter: async (content) => {
      requireConnected();
      const lines = parseHeaderFooterLines(content);
      validateHeaderFooterLines(lines, FOOTER_MAX_LINES, "pie de página");
      const response = await session.publishAndAwaitObject(
        buildFooterWritePayload(content),
        CMD_PIE_TI_F,
        TOOLS_SERIAL_TIMEOUT_MS.default,
      );
      parseSimpleAck(response, "Error al escribir pie de página");
      return { success: true, message: "Pie de página actualizado." };
    },

    reprintDocument: async ({ docType, number, mode = "visualize" }) => {
      requireConnected();
      const docNumber = number ?? 0;
      if (docNumber <= 0) {
        throw new Error("Indique un número de documento válido.");
      }
      const tipoRe = mapReprintTipoRe(docType);

      if (mode === "reprint") {
        const response = await session.publishAndAwaitObject(
          buildReprintPayload(tipoRe, docNumber, true),
          CMD_REIM_REP,
          TOOLS_SERIAL_TIMEOUT_MS.reprint,
        );
        parseSimpleAck(response, "Error al reimprimir documento");
        return {
          success: true,
          message: "Comando enviado a la impresora.",
          mode,
          docType,
          number: docNumber,
        };
      }

      const result = await session.publishAndAwaitTextChunks(
        buildReprintPayload(tipoRe, docNumber, false),
        CMD_REIM_REP,
        TOOLS_SERIAL_TIMEOUT_MS.reprint,
      );
      if (result.terminal.code != null && result.terminal.code !== 0) {
        throw new Error(
          `La impresora rechazó la visualización del documento (código ${result.terminal.code}).`,
        );
      }
      const escPos = parseReprintChunks(result.chunks);
      if (escPos === "") {
        throw new Error("La impresora no devolvió contenido del documento.");
      }
      return {
        success: true,
        escPosContent: escPos,
        mode,
        docType,
        number: docNumber,
      };
    },

    sendTestInvoice: async () => {
      requireConnected();
      const response = await session.publishSequence(
        buildTestInvoicePayloads(),
        CMD_END_FAC,
        TOOLS_SERIAL_TIMEOUT_MS.testInvoice,
      );
      if (response.code != null && response.code !== 0) {
        return {
          success: false,
          message: response.dataS ?? `Error de impresora (code: ${response.code})`,
        };
      }
      return { success: true, message: "Factura de prueba generada correctamente." };
    },

    sendTestCreditNote: async (fiscalSerial) => {
      requireConnected();
      const response = await session.publishSequence(
        buildTestCreditNotePayloads(fiscalSerial),
        CMD_END_NC,
        TOOLS_SERIAL_TIMEOUT_MS.testNote,
      );
      if (response.code != null && response.code !== 0) {
        return {
          success: false,
          message: response.dataS ?? `Error de impresora (code: ${response.code})`,
        };
      }
      return {
        success: true,
        message: "Nota de crédito de prueba generada correctamente.",
      };
    },

    sendTestDebitNote: async (fiscalSerial) => {
      requireConnected();
      const response = await session.publishSequence(
        buildTestDebitNotePayloads(fiscalSerial),
        CMD_END_ND,
        TOOLS_SERIAL_TIMEOUT_MS.testNote,
      );
      if (response.code != null && response.code !== 0) {
        return {
          success: false,
          message: response.dataS ?? `Error de impresora (code: ${response.code})`,
        };
      }
      return {
        success: true,
        message: "Nota de débito de prueba generada correctamente.",
      };
    },

    sendTestGenerateZ: async () => {
      requireConnected();
      const response = await session.publishSequence(
        buildTestGenerateZPayloads(),
        CMD_GEN_IMP_REP_Z,
        TOOLS_SERIAL_TIMEOUT_MS.testGenerateZ,
      );
      if (response.code != null && response.code !== 0) {
        return {
          success: false,
          message: response.dataS ?? `Error de impresora (code: ${response.code})`,
        };
      }
      return { success: true, message: "Reporte Z de prueba generado correctamente." };
    },
  };
}
