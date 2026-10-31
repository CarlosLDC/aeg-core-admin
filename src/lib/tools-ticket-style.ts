import { HEADER_FOOTER_MAX_LINE_LENGTH } from "@/modules/tools/serial/tools-header-footer-payload";
import type {
  ToolsCashDrawerConfig,
  ToolsCustomerDisplayConfig,
  ToolsPeripheralsConfig,
  ToolsTicketLineStyle,
} from "@/types/tools-customization";

export const DEFAULT_TICKET_LINE_STYLE: ToolsTicketLineStyle = {
  neg: false,
  alto: 1,
  ancho: 1,
  sub: 0,
  alin: "L",
};

export const CUSTOMER_DISPLAY_LINE_LENGTH = 20;
export const CASH_DRAWER_PULSE_MIN_MS = 10;
export const CASH_DRAWER_PULSE_MAX_MS = 510;
export const FORMAS_PAGO_COUNT = 16;

export function defaultPeripheralsConfig(): ToolsPeripheralsConfig {
  return {
    gaveta: {
      activo: false,
      pin: 2,
      tOn: 120,
      tOff: 240,
      modo: "FP",
      fpAbre: [1],
    },
    visor: {
      activo: false,
      proto: "ESCPOS",
      baud: 9600,
      bienv: ["BIENVENIDO", ""],
      verItem: true,
      verTotal: true,
      verVuelto: true,
      brillo: 4,
    },
  };
}

/** Máximo de caracteres de una línea libre según el ancho de fuente. */
export function maxCharsForStyle(style: ToolsTicketLineStyle): number {
  return Math.floor(HEADER_FOOTER_MAX_LINE_LENGTH / style.ancho);
}

export function normalizeLineStyles(
  styles: ToolsTicketLineStyle[] | undefined,
  lineCount: number,
): ToolsTicketLineStyle[] {
  return Array.from({ length: lineCount }, (_, index) => ({
    ...DEFAULT_TICKET_LINE_STYLE,
    ...(styles?.[index] ?? {}),
  }));
}

export function validateStyledLines(
  lines: string[],
  styles: ToolsTicketLineStyle[],
  label: string,
): string | null {
  for (let index = 0; index < lines.length; index++) {
    const style = styles[index] ?? DEFAULT_TICKET_LINE_STYLE;
    const max = maxCharsForStyle(style);
    if (lines[index].length > max) {
      return `La línea ${index + 1} del ${label} tiene ${lines[index].length} caracteres; con doble ancho el máximo es ${max}.`;
    }
  }
  return null;
}

/** Redondea al múltiplo de 2 ms más cercano dentro del rango ESC p. */
export function normalizePulseMs(value: number): number {
  if (!Number.isFinite(value)) return CASH_DRAWER_PULSE_MIN_MS;
  const clamped = Math.min(
    CASH_DRAWER_PULSE_MAX_MS,
    Math.max(CASH_DRAWER_PULSE_MIN_MS, Math.round(value)),
  );
  return clamped % 2 === 0 ? clamped : clamped - 1;
}

export function validateCashDrawer(config: ToolsCashDrawerConfig): string | null {
  if (!config.activo) return null;
  for (const [label, value] of [
    ["duración del pulso", config.tOn],
    ["pausa", config.tOff],
  ] as const) {
    if (
      value < CASH_DRAWER_PULSE_MIN_MS ||
      value > CASH_DRAWER_PULSE_MAX_MS ||
      value % 2 !== 0
    ) {
      return `La ${label} debe ser un número par entre ${CASH_DRAWER_PULSE_MIN_MS} y ${CASH_DRAWER_PULSE_MAX_MS} ms.`;
    }
  }
  if (config.modo === "FP" && config.fpAbre.length === 0) {
    return "Seleccione al menos una forma de pago que abra la gaveta.";
  }
  if (config.fpAbre.some((nro) => nro < 1 || nro > FORMAS_PAGO_COUNT)) {
    return "Forma de pago fuera de rango.";
  }
  return null;
}

export function validateCustomerDisplay(
  config: ToolsCustomerDisplayConfig,
): string | null {
  if (!config.activo) return null;
  if (config.bienv.some((line) => line.length > CUSTOMER_DISPLAY_LINE_LENGTH)) {
    return `Cada línea del mensaje de bienvenida admite ${CUSTOMER_DISPLAY_LINE_LENGTH} caracteres.`;
  }
  if (config.brillo < 1 || config.brillo > 4) {
    return "El brillo debe estar entre 1 y 4.";
  }
  return null;
}

/** Comandos ESC/POS equivalentes (referencia para firmware / depuración). */
export function lineStyleToEscPos(style: ToolsTicketLineStyle): number[] {
  const align = style.alin === "C" ? 1 : style.alin === "R" ? 2 : 0;
  const size = ((style.ancho - 1) << 4) | (style.alto - 1);
  return [
    0x1b, 0x61, align, // ESC a n
    0x1b, 0x45, style.neg ? 1 : 0, // ESC E n
    0x1b, 0x2d, style.sub, // ESC - n
    0x1d, 0x21, size, // GS ! n
  ];
}
