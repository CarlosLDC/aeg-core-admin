import type {
  ToolsFormasPagoReadResponse,
  ToolsHeaderFooterReadResponse,
  ToolsMqttSimpleResponse,
  ToolsMqttStatusResponse,
  ToolsReprintMode,
  ToolsReprintResponse,
  ToolsReportXResponse,
  ToolsReportZResponse,
  ToolsTransmitZResponse,
  ToolsWifiScanResponse,
} from "@/types/tools-mqtt";

export type ToolsConnectionMode = "wifi" | "usb";

export interface ToolsPrinterTransport {
  readonly mode: ToolsConnectionMode;
  readonly isReady: boolean;
  readonly connectionLabel: string;
  disconnect(): Promise<void>;

  fetchStatus(): Promise<ToolsMqttStatusResponse>;
  scanWifi(): Promise<ToolsWifiScanResponse>;
  connectWifi(ssid: string, password: string): Promise<ToolsMqttSimpleResponse>;
  resetWifi(): Promise<ToolsMqttSimpleResponse>;
  listReportZ(): Promise<ToolsReportZResponse>;
  generateReportZ(): Promise<ToolsReportZResponse>;
  getReportZ(reportNumber: number): Promise<ToolsReportZResponse>;
  transmitReportZ(): Promise<ToolsTransmitZResponse>;
  sendReportX(): Promise<ToolsReportXResponse>;
  readFormasPago(): Promise<ToolsFormasPagoReadResponse>;
  writeFormasPago(nroFP: number, descripcion: string): Promise<ToolsMqttSimpleResponse>;
  readHeader(): Promise<ToolsHeaderFooterReadResponse>;
  writeHeader(content: string): Promise<ToolsMqttSimpleResponse>;
  readFooter(): Promise<ToolsHeaderFooterReadResponse>;
  writeFooter(content: string): Promise<ToolsMqttSimpleResponse>;
  reprintDocument(options: {
    docType?: string;
    number?: number;
    mode?: ToolsReprintMode;
  }): Promise<ToolsReprintResponse>;
  sendTestInvoice(): Promise<ToolsMqttSimpleResponse>;
  sendTestCreditNote(fiscalSerial: string): Promise<ToolsMqttSimpleResponse>;
  sendTestDebitNote(fiscalSerial: string): Promise<ToolsMqttSimpleResponse>;
  sendTestGenerateZ(): Promise<ToolsMqttSimpleResponse>;
}
