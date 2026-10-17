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
export {
  ToolsSectionProvider,
  ToolsSectionContext,
  useToolsSectionContext,
  readStoredToolsTableState,
  saveStoredToolsTableState,
  clearStoredToolsTableState,
  TOOLS_TABLE_STORAGE_KEY,
  DEFAULT_TOOLS_PAGE_SIZE,
  DEFAULT_TOOLS_SORT,
  type ToolsTableState,
  type ToolsPrinterSortKey,
  type ToolsSectionContextValue,
} from "./printers/tools-printers-context";
export { useToolsPrinters } from "./printers/use-tools-printers";
export { useToolsMqtt, useToolsPrinterConnection } from "./mqtt/use-tools-mqtt";
export type { ToolsPrinterConnectionState } from "./mqtt/use-tools-mqtt";
export { TOOLS_PRINTER_OFFLINE_MESSAGE } from "@/lib/tools-printer-connection";

export type {
  MqttCommand,
  MqttCommandName,
  MqttEvent,
  MqttEventType,
  MqttPrinterResponse,
  MqttPublishResult,
  StatusInfoResponse,
} from "./mqtt/types";
