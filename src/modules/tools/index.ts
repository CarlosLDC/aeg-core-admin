export * from "./tools-registry";

export type {
  ToolsPrinter,
  ToolsPrinterClientSummary,
  ToolsPrinterLocationSource,
} from "./shared/types";

export type { PrinterStatusCounts, ToolsStatusBucket } from "./shared/formatters";

export {
  filterPrinters,
  extractLocation,
  adaptStatusTerminology,
  countPrintersByStatus,
  filterToolsPrintersByStatus,
  formatDate,
} from "./shared/formatters";

export {
  mapCorePrinterToTools,
  mapCorePrintersToTools,
} from "./shared/map-core-printer";

export { escPosToHtml } from "./escpos/esc-pos-to-html";

export { loadToolsPrinterCatalog } from "./printers/tools-printers-api";
export { useToolsPrinters } from "./printers/use-tools-printers";
export { useToolsMqtt, useToolsPrinterConnection } from "./mqtt/use-tools-mqtt";
export type { ToolsPrinterConnectionState } from "./mqtt/use-tools-mqtt";
export { TOOLS_PRINTER_OFFLINE_MESSAGE } from "./mqtt/tools-printer-connection";

export type {
  MqttCommand,
  MqttCommandName,
  MqttEvent,
  MqttEventType,
  MqttPrinterResponse,
  MqttPublishResult,
  StatusInfoResponse,
} from "./mqtt/types";
