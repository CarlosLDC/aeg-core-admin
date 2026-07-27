export const TOOLS_SERIAL_DEFAULT_BAUD_RATE = 115_200;

export const TOOLS_SERIAL_TIMEOUT_MS = {
  status: 15_000,
  wifi: 30_000,
  wifiScan: 10_000,
  reportZ: 20_000,
  formasPago: 10_000,
  reprint: 60_000,
  default: 15_000,
  testInvoice: 5_000,
  testNote: 6_000,
  testGenerateZ: 5_000,
} as const;

export const TOOLS_SERIAL_COMMAND_DELAY_MS = 50;

export const CMD_STA_INF = "StaInf";
export const CMD_WIFI_CONF = "wifiConf";
export const CMD_RESET_MF = "resetMF";
export const CMD_GET_REP_Z = "getRepZ";
export const CMD_REP_Z = "RepZ";
export const CMD_IMP_REP_X = "impRepX";
// TODO(tools-report-x): pendiente comando MQTT definitivo para vista previa SIN impresión.
// Hoy impRepX imprime al generar; impFis:0 no basta. Cuando el usuario aporte el comando
// correcto, actualizar buildReportXPayload / reportXPayload y el flujo visualize→print.
export const CMD_DESC_FP = "descFP";
export const CMD_W_FILE_SPIFF = "wFileSPIFF";
export const CMD_PIE_TI_F = "pieTiF";
export const CMD_REIM_REP = "reimRep";
export const CMD_END_FAC = "endFac";
export const CMD_END_NC = "endNC";
export const CMD_END_ND = "endND";
export const CMD_GEN_IMP_REP_Z = "genImpRepZ";

export const STA_CONEXION_SIN_DNF = "StaConexionSinDNF";
export const STA_GET_ACC_POI = "GetAccPoi";
export const STA_ULT_Z_TX_SENI = "UltZTxSeni";
export const STA_MEDIOS_PAGOS = "MediosPagos";
export const STA_ENC_FIJ = "staEncFij";
export const STA_PIE_FIJ = "staPieFij";

export const SPIFF_ACCESS = "AeG-1968-2024";
export const PARAM_FAC_SPIFF_FILE = "paramFacSPIFF.json";
export const RESET_MF_DATA = 5555;

export const TEST_PRODUCT_DESCRIPTION = "PRODUCTO";
export const TEST_NOTE_DATE = "02/06/2025";

export const TOOLS_FISCAL_ERROR_Z_NOT_FOUND = 48;
