export type ToolsMqttAdditionalInfo = {
  wifiNetwork: string;
  ipAddress: string;
  lastZReport: number;
  lastZTransmitted: number | null;
  daysSinceLastTx: number;
};

export type ToolsMqttStatusResponse = {
  success: boolean;
  message?: string | null;
  seniatStatus?: "EN LINEA" | "SIN CONEXION" | null;
  additionalInfo?: ToolsMqttAdditionalInfo | null;
  code?: number | null;
};

export type ToolsMqttSimpleResponse = {
  success: boolean;
  message?: string | null;
};

export type ToolsWifiNetwork = {
  ssid: string;
  signal: number | null;
};

export type ToolsWifiScanResponse = {
  success: boolean;
  message?: string | null;
  networks?: ToolsWifiNetwork[];
};

export type ToolsReportZData = {
  report: Record<string, unknown>;
};

export type ToolsReportZResponse = {
  success: boolean;
  message?: string | null;
  code?: number | null;
  report?: ToolsReportZData | null;
};

export type ToolsTransmitZResponse = {
  success: boolean;
  message?: string | null;
  lastTransmittedZ?: number | null;
  seniatUnavailable?: boolean;
};

export type ToolsFormasPagoItem = {
  nro: number;
  descripcion: string;
};

export type ToolsFormasPagoReadResponse = {
  success: boolean;
  message?: string | null;
  formasPago?: ToolsFormasPagoItem[];
};

export type ToolsHeaderFooterReadResponse = {
  success: boolean;
  message?: string | null;
  content?: string | null;
};

export type ToolsReprintResponse = {
  success: boolean;
  message?: string | null;
  code?: number | null;
  escPosContent?: string | null;
  mode?: string | null;
  docType?: string | null;
  number?: number | null;
};

export type ToolsReprintMode = "visualize" | "reprint" | "test";

export type ToolsReportXMode = "visualize" | "print";

export type ToolsReportXResponse = {
  success: boolean;
  message?: string | null;
  escPosContent?: string | null;
};
