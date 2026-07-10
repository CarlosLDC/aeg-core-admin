/** Parsea el texto remoto del encabezado o pie en líneas editables. */
export function parseToolsHeaderFooterContent(
  content: string | null | undefined,
): string[] {
  if (content == null || content.length === 0) {
    return [""];
  }

  return content.split(/\r?\n/);
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
