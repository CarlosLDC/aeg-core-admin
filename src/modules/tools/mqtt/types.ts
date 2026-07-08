export const TOOLS_MQTT_BROKER_URL = "mqtt://13.51.138.105";

export function mqttCommandTopic(macAddress: string): string {
  const cleanMac = macAddress.replace(/:/g, "");
  return `/${cleanMac}/AEG_Fiscal/Integracion/Comando`;
}

export function cleanMacAddress(macAddress: string): string {
  return macAddress.replace(/:/g, "");
}

export type MqttCommandName =
  | "StaInf"
  | "reimRep"
  | "getRepZ"
  | "RepZ"
  | "wifiConf"
  | "resetMF"
  | "wFileSPIFF"
  | "pieTiF"
  | "descFP"
  | "impRepX"
  | "updFirmDown";

export type StaInfStatus =
  | "StaConexionSinDNF"
  | "UltZTxSeni"
  | "staEncFij"
  | "staPieFij";

export interface MqttCommand<TData = Record<string, unknown>> {
  cmd: MqttCommandName | string;
  data?: TData;
}

export interface StaInfCommand extends MqttCommand<{ status: StaInfStatus | string }> {
  cmd: "StaInf";
}

export interface MqttPrinterResponse {
  cmd?: string;
  code?: number;
  message?: string;
  dataD?: number;
  dataS?: string;
}

export interface SeniatStatusData {
  EstatusSeniat?: string;
  ConexionWifi?: string;
  direccionIP?: string;
  NroUltZEmit?: number;
  NroUltZTx?: number;
  DiasSinTx?: number;
  [key: string]: unknown;
}

export type SeniatConnectionStatus = "EN LINEA" | "SIN CONEXION";

export interface StatusInfoResponse {
  success: boolean;
  seniatStatus?: SeniatConnectionStatus;
  additionalInfo?: {
    wifiNetwork: string;
    ipAddress: string;
    lastZReport: number;
    lastZTransmitted?: number;
    daysSinceLastTx: number;
  } | null;
  message?: string;
  code?: number;
}

export interface LastTransmittedZResponse {
  success: boolean;
  lastTransmittedZ?: number;
  seniatUnavailable?: boolean;
  message?: string;
}

export interface MqttPublishResult {
  success: boolean;
  message?: string;
}

export interface MqttConnectionOptions {
  brokerUrl?: string;
  macAddress?: string;
}

export type MqttEventType = "connected" | "message" | "error" | "disconnected";

export interface MqttEvent {
  type: MqttEventType;
  macAddress?: string;
  topic?: string;
  payload?: unknown;
  message?: string;
  at: string;
}
