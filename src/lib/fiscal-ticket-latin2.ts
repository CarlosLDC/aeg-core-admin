/** Codificación requerida por impresoras fiscales venezolanas (ISO/IEC 8859-2). */
export const FISCAL_TICKET_CHARSET = "iso-8859-2" as const;

export type FiscalTicketCharset = typeof FISCAL_TICKET_CHARSET;

const ISO_8859_2_CODEPOINTS: readonly number[] = [
  0x0080, 0x0081, 0x0082, 0x0083, 0x0084, 0x0085, 0x0086, 0x0087, 0x0088,
  0x0089, 0x008a, 0x008b, 0x008c, 0x008d, 0x008e, 0x008f, 0x0090, 0x0091,
  0x0092, 0x0093, 0x0094, 0x0095, 0x0096, 0x0097, 0x0098, 0x0099, 0x009a,
  0x009b, 0x009c, 0x009d, 0x009e, 0x009f, 0x00a0, 0x0104, 0x02d8, 0x0141,
  0x00a4, 0x013d, 0x015a, 0x00a7, 0x00a8, 0x0160, 0x015e, 0x0164, 0x0179,
  0x00ad, 0x017d, 0x017b, 0x00b0, 0x0105, 0x02db, 0x0142, 0x00b4, 0x013e,
  0x015b, 0x02c7, 0x00b8, 0x0161, 0x015f, 0x0165, 0x017a, 0x02dd, 0x017e,
  0x017c, 0x0154, 0x00c1, 0x00c2, 0x0102, 0x00c4, 0x0139, 0x0106, 0x00c7,
  0x010c, 0x00c9, 0x0118, 0x00cb, 0x011a, 0x00cd, 0x00ce, 0x010e, 0x0110,
  0x0143, 0x0147, 0x00d3, 0x00d4, 0x0150, 0x00d6, 0x00d7, 0x0158, 0x016e,
  0x00da, 0x0170, 0x00dc, 0x00dd, 0x0162, 0x00df, 0x0155, 0x00e1, 0x00e2,
  0x0103, 0x00e4, 0x013a, 0x0107, 0x00e7, 0x010d, 0x00e9, 0x0119, 0x00eb,
  0x011b, 0x00ed, 0x00ee, 0x010f, 0x0111, 0x0144, 0x0148, 0x00f3, 0x00f4,
  0x0151, 0x00f6, 0x00f7, 0x0159, 0x016f, 0x00fa, 0x0171, 0x00fc, 0x00fd,
  0x0163, 0x02d9,
];

const UNICODE_TO_ISO_8859_2_BYTE = new Map<number, number>();

for (let index = 0; index < ISO_8859_2_CODEPOINTS.length; index += 1) {
  const codePoint = ISO_8859_2_CODEPOINTS[index]!;
  UNICODE_TO_ISO_8859_2_BYTE.set(codePoint, index + 0x80);
}

const UNSUPPORTED_CHAR_REPLACEMENTS: Readonly<Record<string, string>> = {
  "\u2014": "-",
  "\u2013": "-",
  "\u2212": "-",
  "\u2018": "'",
  "\u2019": "'",
  "\u201c": '"',
  "\u201d": '"',
  "\u2026": "...",
  "\u202f": " ",
  "\u00a0": " ",
};

/** Normaliza texto de ticket a caracteres representables en Latin-2. */
export function normalizeFiscalTicketText(value: string): string {
  let normalized = value.normalize("NFC");

  for (const [unsupported, replacement] of Object.entries(
    UNSUPPORTED_CHAR_REPLACEMENTS,
  )) {
    normalized = normalized.replaceAll(unsupported, replacement);
  }

  return Array.from(normalized)
    .map((char) => {
      const codePoint = char.codePointAt(0);
      if (codePoint == null) return "";
      if (codePoint < 0x80) return char;
      if (UNICODE_TO_ISO_8859_2_BYTE.has(codePoint)) return char;
      if (codePoint <= 0xffff) {
        const decomposed = char.normalize("NFD");
        if (decomposed.length > 1 && /^[\x00-\x7f]+$/.test(decomposed)) {
          return decomposed;
        }
      }
      return "?";
    })
    .join("");
}

export function encodeLatin2(text: string): Uint8Array {
  const normalized = normalizeFiscalTicketText(text);
  const bytes = new Uint8Array(normalized.length);

  for (let index = 0; index < normalized.length; index += 1) {
    const char = normalized[index]!;
    const codePoint = char.codePointAt(0)!;
    if (codePoint < 0x80) {
      bytes[index] = codePoint;
      continue;
    }
    bytes[index] = UNICODE_TO_ISO_8859_2_BYTE.get(codePoint) ?? 0x3f;
  }

  return bytes;
}

export function decodeLatin2(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => {
      if (byte < 0x80) return String.fromCharCode(byte);
      const codePoint = ISO_8859_2_CODEPOINTS[byte - 0x80];
      return codePoint != null ? String.fromCodePoint(codePoint) : "?";
    })
    .join("");
}
