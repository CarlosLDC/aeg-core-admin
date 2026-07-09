export const FORMAS_PAGO_DIVISA_MIN = 11;
export const FORMAS_PAGO_DIVISA_MAX = 16;

export function isFormaPagoDivisa(nro: number): boolean {
  return nro >= FORMAS_PAGO_DIVISA_MIN && nro <= FORMAS_PAGO_DIVISA_MAX;
}
