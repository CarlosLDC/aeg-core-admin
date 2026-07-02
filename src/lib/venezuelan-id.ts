export const RIF_LETTERS = ["V", "E", "J", "P", "G"] as const;
export const CEDULA_LETTERS = ["V", "E"] as const;

export type RifLetter = (typeof RIF_LETTERS)[number];
export type CedulaLetter = (typeof CEDULA_LETTERS)[number];

export function parsePrefixedDocument(
  raw: string,
  allowedLetters: readonly string[],
  defaultLetter: string,
): { letter: string; digits: string } {
  const normalized = raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!normalized) {
    return { letter: defaultLetter, digits: "" };
  }

  const match = normalized.match(/^([A-Z])(\d*)$/);
  if (match) {
    const letter = allowedLetters.includes(match[1]!)
      ? match[1]!
      : defaultLetter;
    return { letter, digits: match[2] ?? "" };
  }

  if (/^\d+$/.test(normalized)) {
    return { letter: defaultLetter, digits: normalized };
  }

  return { letter: defaultLetter, digits: "" };
}

export function formatPrefixedDocument(letter: string, digits: string): string {
  const normalizedDigits = digits.replace(/\D/g, "");
  if (!normalizedDigits) return "";
  return `${letter}${normalizedDigits}`;
}

export function parseRif(raw: string): { letter: RifLetter; digits: string } {
  const parsed = parsePrefixedDocument(raw, RIF_LETTERS, "J");
  return {
    letter: parsed.letter as RifLetter,
    digits: parsed.digits,
  };
}

export function parseCedula(raw: string): { letter: CedulaLetter; digits: string } {
  const parsed = parsePrefixedDocument(raw, CEDULA_LETTERS, "V");
  return {
    letter: parsed.letter as CedulaLetter,
    digits: parsed.digits,
  };
}

export function formatRif(letter: string, digits: string): string {
  return formatPrefixedDocument(letter, digits);
}

export function formatCedula(letter: string, digits: string): string {
  return formatPrefixedDocument(letter, digits);
}
