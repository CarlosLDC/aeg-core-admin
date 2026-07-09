export const FORMAS_PAGO_DIVISA_MIN = 11;
export const FORMAS_PAGO_DIVISA_MAX = 16;
export const FORMAS_PAGO_DESCRIPCION_MAX_LENGTH = 20;

export function isFormaPagoDivisa(nro: number): boolean {
  return nro >= FORMAS_PAGO_DIVISA_MIN && nro <= FORMAS_PAGO_DIVISA_MAX;
}

export function normalizeFormaPagoDescripcion(value: string): string {
  return value.slice(0, FORMAS_PAGO_DESCRIPCION_MAX_LENGTH);
}

export function validateFormaPagoDescripcion(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "La descripción no puede estar vacía.";
  if (trimmed.length > FORMAS_PAGO_DESCRIPCION_MAX_LENGTH) {
    return `La descripción no puede superar ${FORMAS_PAGO_DESCRIPCION_MAX_LENGTH} caracteres.`;
  }
  return null;
}
