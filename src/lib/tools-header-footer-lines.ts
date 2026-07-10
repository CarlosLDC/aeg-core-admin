import { decodeLatin2 } from "@/lib/fiscal-ticket-latin2";

/** Decodifica texto fiscal Latin-2 mal interpretado como UTF-8 en tránsito. */
export function decodeToolsHeaderFooterText(text: string): string {
  if (!text || text.includes("\uFFFD")) {
    return text;
  }

  const hasHighByte = [...text].some((char) => char.charCodeAt(0) > 127);
  if (!hasHighByte) {
    return text;
  }

  if (/[áéíóúñÁÉÍÓÚÑ]/.test(text)) {
    return text;
  }

  const bytes = Uint8Array.from(text, (char) => char.charCodeAt(0) & 0xff);
  return decodeLatin2(bytes);
}

/** Parsea el texto remoto del encabezado o pie en líneas editables. */
export function parseToolsHeaderFooterContent(
  content: string | null | undefined,
): string[] {
  if (content == null || content.length === 0) {
    return [""];
  }

  return decodeToolsHeaderFooterText(content).split(/\r?\n/);
}

/** Serializa las líneas editadas al formato esperado por la escritura remota. */
export function serializeToolsHeaderFooterLines(lines: string[]): string {
  return lines.join("\n");
}

/** Compara dos listas de líneas sin depender de la referencia del array. */
export function toolsHeaderFooterLinesEqual(
  a: readonly string[],
  b: readonly string[],
): boolean {
  if (a.length !== b.length) {
    return false;
  }

  return a.every((line, index) => line === b[index]);
}
