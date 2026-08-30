/**
 * Utilidades para formateo y máscara de números de teléfono en Venezuela.
 * Formato esperado: XXX XXX XXXX (10 dígitos sin el 0 inicial).
 * Ejemplo: 04121851051 -> 412 185 1051
 */

export const VENEZUELAN_PHONE_PLACEHOLDER = "412 185 1051";

/**
 * Normaliza y extrae únicamente los dígitos relevantes para el número telefónico venezolano.
 * Remueve prefijo internacional (+58 o 58) y el 0 inicial de la operadora / código de área.
 * Limita el resultado a un máximo de 10 dígitos.
 */
export function normalizeVenezuelanPhoneDigits(raw: string | null | undefined): string {
  if (!raw) return "";

  let digits = raw.replace(/\D/g, "");
  if (!digits) return "";

  // Si tiene código de país 58 al inicio con longitud mayor a 10 dígitos
  if (digits.startsWith("58") && digits.length > 10) {
    digits = digits.slice(2);
  }

  // Si empieza con 0 (p. ej. 0412...), remover el 0 inicial
  if (digits.startsWith("0")) {
    digits = digits.slice(1);
  }

  // Máximo 10 dígitos (3 código área/operadora + 7 abonado)
  return digits.slice(0, 10);
}

/**
 * Aplica la máscara visual venezolana: `XXX XXX XXXX`.
 * Ejemplo: `04121851051` -> `412 185 1051`.
 */
export function formatVenezuelanPhone(raw: string | null | undefined): string {
  const digits = normalizeVenezuelanPhoneDigits(raw);
  if (!digits) return "";

  if (digits.length <= 3) {
    return digits;
  }
  if (digits.length <= 6) {
    return `${digits.slice(0, 3)} ${digits.slice(3)}`;
  }
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
}
