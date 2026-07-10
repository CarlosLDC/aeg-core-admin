import {
  connectToolsWifi,
  fetchToolsMqttStatus,
  generateToolsReportZ,
  getToolsReportZ,
  listToolsReportZ,
  readToolsFooter,
  readToolsFormasPago,
  readToolsHeader,
  reprintToolsDocument,
  resetToolsWifi,
  scanToolsWifi,
  sendToolsReportX,
  sendToolsTestCreditNote,
  sendToolsTestDebitNote,
  sendToolsTestGenerateZ,
  sendToolsTestInvoice,
  transmitToolsReportZ,
  writeToolsFooter,
  writeToolsFormasPago,
  writeToolsHeader,
} from "@/lib/tools-mqtt-api";
import type { ToolsPrinterTransport } from "@/modules/tools/transport/tools-printer-transport";

export function createMqttTransport(
  printerId: number,
  macReady: boolean,
): ToolsPrinterTransport {
  return {
    mode: "wifi",
    isReady: macReady,
    connectionLabel: "WiFi / MQTT",

    disconnect: async () => {},

    fetchStatus: () => fetchToolsMqttStatus(printerId),
    scanWifi: () => scanToolsWifi(printerId),
    connectWifi: (ssid, password) => connectToolsWifi(printerId, ssid, password),
    resetWifi: () => resetToolsWifi(printerId),
    listReportZ: () => listToolsReportZ(printerId),
    generateReportZ: () => generateToolsReportZ(printerId),
    getReportZ: (reportNumber) => getToolsReportZ(printerId, reportNumber),
    transmitReportZ: () => transmitToolsReportZ(printerId),
    sendReportX: () => sendToolsReportX(printerId),
    readFormasPago: () => readToolsFormasPago(printerId),
    writeFormasPago: (nroFP, descripcion) =>
      writeToolsFormasPago(printerId, nroFP, descripcion),
    readHeader: () => readToolsHeader(printerId),
    writeHeader: (content) => writeToolsHeader(printerId, content),
    readFooter: () => readToolsFooter(printerId),
    writeFooter: (content) => writeToolsFooter(printerId, content),
    reprintDocument: (options) => reprintToolsDocument(printerId, options),
    sendTestInvoice: () => sendToolsTestInvoice(printerId),
    sendTestCreditNote: () => sendToolsTestCreditNote(printerId),
    sendTestDebitNote: () => sendToolsTestDebitNote(printerId),
    sendTestGenerateZ: () => sendToolsTestGenerateZ(printerId),
  };
}
