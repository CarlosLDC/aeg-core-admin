/** Formato serial fiscal de impresoras: 3 letras + 7 dígitos. */
export const FISCAL_SERIAL_LETTER_COUNT = 3;
export const FISCAL_SERIAL_DIGIT_COUNT = 7;
export const FISCAL_SERIAL_PATTERN = /^[A-Z]{3}[0-9]{7}$/;

export const DEFAULT_BATCH_MAX_COUNT = 500;
export const DEFAULT_SEAL_DIGIT_COUNT = 7;

export type SerialRangeInput = {
  prefix: string;
  from: string;
  to: string;
  digitLength?: number | string;
};

function resolveDigitLength(
  value: number | string | undefined,
  fallback: number,
): number {
  if (value === undefined || value === "") return fallback;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export type SerialRangeMode = "fiscal" | "flexible";

export type SerialRangeBuildOptions = {
  mode: SerialRangeMode;
  maxCount?: number;
};

export function formatSerialNumber(
  prefix: string,
  number: number,
  digitLength: number,
  uppercasePrefix = true,
): string {
  const normalizedPrefix = uppercasePrefix
    ? prefix.trim().toUpperCase()
    : prefix.trim();
  const padded = String(number).padStart(digitLength, "0");
  if (padded.length > digitLength) {
    throw new Error(
      `El número ${number} supera ${digitLength} dígitos en el rango.`,
    );
  }
  return `${normalizedPrefix}${padded}`;
}

export function validateSerialRangeInput(
  input: SerialRangeInput,
  options: SerialRangeBuildOptions,
): string | null {
  const maxCount = options.maxCount ?? DEFAULT_BATCH_MAX_COUNT;
  const digitLength =
    options.mode === "fiscal"
      ? FISCAL_SERIAL_DIGIT_COUNT
      : resolveDigitLength(input.digitLength, DEFAULT_SEAL_DIGIT_COUNT);

  if (options.mode === "fiscal") {
    const prefix = input.prefix.trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(prefix)) {
      return "El prefijo debe ser exactamente 3 letras (ej. ABC).";
    }
  } else {
    const prefix = input.prefix.trim();
    if (!prefix) {
      return "Indica un prefijo para los seriales (ej. SN- o ABC).";
    }
    if (prefix.length > 20) {
      return "El prefijo no puede superar 20 caracteres.";
    }
  }

  if (!/^\d+$/.test(input.from.trim()) || !/^\d+$/.test(input.to.trim())) {
    return "Desde y hasta deben ser números enteros.";
  }

  const from = Number(input.from);
  const to = Number(input.to);
  if (!Number.isInteger(from) || !Number.isInteger(to)) {
    return "Desde y hasta deben ser números enteros.";
  }
  if (from < 0 || to < 0) {
    return "Los números del rango deben ser mayores o iguales a 0.";
  }
  if (from > to) {
    return "«Desde» no puede ser mayor que «Hasta».";
  }

  const count = to - from + 1;
  if (count > maxCount) {
    return `El rango genera ${count} registros; el máximo permitido es ${maxCount}.`;
  }

  if (options.mode === "flexible") {
    if (!Number.isInteger(digitLength) || digitLength < 1 || digitLength > 12) {
      return "La longitud numérica debe estar entre 1 y 12 dígitos.";
    }
    const maxInRange = to;
    if (String(maxInRange).length > digitLength) {
      return `«Hasta» (${to}) no cabe en ${digitLength} dígitos con ceros a la izquierda.`;
    }
  } else if (to > 10 ** FISCAL_SERIAL_DIGIT_COUNT - 1) {
    return `El número final no puede superar ${"9".repeat(FISCAL_SERIAL_DIGIT_COUNT)}.`;
  }

  return null;
}

export function buildSerialRange(
  input: SerialRangeInput,
  options: SerialRangeBuildOptions,
): string[] | string {
  const error = validateSerialRangeInput(input, options);
  if (error) return error;

  const digitLength =
    options.mode === "fiscal"
      ? FISCAL_SERIAL_DIGIT_COUNT
      : resolveDigitLength(input.digitLength, DEFAULT_SEAL_DIGIT_COUNT);

  const prefix = input.prefix.trim();
  const uppercasePrefix = options.mode === "fiscal";

  const from = Number(input.from);
  const to = Number(input.to);
  const serials: string[] = [];

  for (let n = from; n <= to; n++) {
    try {
      serials.push(
        formatSerialNumber(prefix, n, digitLength, uppercasePrefix),
      );
    } catch (err) {
      return err instanceof Error ? err.message : "Rango de seriales no válido.";
    }
  }

  return serials;
}

export function describeSerialRangePreview(
  serials: string[],
  maxItems = 4,
): string {
  if (serials.length === 0) return "";
  if (serials.length <= maxItems) {
    return serials.join(", ");
  }
  const head = serials.slice(0, maxItems - 1);
  return `${head.join(", ")} … ${serials[serials.length - 1]}`;
}
