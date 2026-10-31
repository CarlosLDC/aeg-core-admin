/**
 * Periféricos (gaveta / visor) y personalización del ticket (logo / estilos).
 * Contrato propuesto: aeg-core/core/docs/TOOLS_PERIFERICOS_TICKET_MQTT.md
 */

export type ToolsCashDrawerPin = 2 | 5;
export type ToolsCashDrawerMode = "NUNCA" | "SIEMPRE" | "FP";

export type ToolsCashDrawerConfig = {
  activo: boolean;
  pin: ToolsCashDrawerPin;
  /** Duración del pulso en ms (10–510, múltiplo de 2). */
  tOn: number;
  /** Pausa posterior en ms (10–510, múltiplo de 2). */
  tOff: number;
  modo: ToolsCashDrawerMode;
  /** Números de forma de pago (1–16) que abren la gaveta cuando modo = FP. */
  fpAbre: number[];
};

export type ToolsCustomerDisplayProtocol = "ESCPOS" | "CD5220" | "EPSON_DMD";
export type ToolsCustomerDisplayBaud = 2400 | 4800 | 9600 | 19200;

export type ToolsCustomerDisplayConfig = {
  activo: boolean;
  proto: ToolsCustomerDisplayProtocol;
  baud: ToolsCustomerDisplayBaud;
  /** Mensaje de bienvenida (2 líneas × 20 caracteres). */
  bienv: [string, string];
  verItem: boolean;
  verTotal: boolean;
  verVuelto: boolean;
  /** 1–4 */
  brillo: number;
};

export type ToolsPeripheralsConfig = {
  gaveta: ToolsCashDrawerConfig;
  visor: ToolsCustomerDisplayConfig;
};

export type ToolsTicketAlign = "L" | "C" | "R";

export type ToolsTicketLineStyle = {
  neg: boolean;
  alto: 1 | 2;
  ancho: 1 | 2;
  sub: 0 | 1 | 2;
  alin: ToolsTicketAlign;
};

export type ToolsTicketStyles = {
  enc: ToolsTicketLineStyle[];
  pie: ToolsTicketLineStyle[];
};

export type ToolsTicketLogo = {
  /** Ancho en puntos (múltiplo de 8). */
  ancho: number;
  alto: number;
  /** Raster 1bpp (MSB primero, 1 = negro) en base64. */
  datos: string;
  crc32: string;
  activo: boolean;
  alin: ToolsTicketAlign;
};

export type ToolsPrinterCapabilities = {
  gaveta: boolean;
  visor: boolean;
  logo: boolean;
  estilos: boolean;
  anchoPapelPx: number;
  logoMaxAlto: number;
};

export type ToolsCustomizationSimpleResult = {
  success: boolean;
  message: string;
};
