/** Etiqueta de opción de catálogo por id, sin prefijo numérico. */
export function catalogOptionLabel(
  options: Array<{ value: string; label: string }>,
  id: number | null | undefined,
  fallback = "—",
): string {
  if (id == null) return fallback;
  return options.find((opt) => Number(opt.value) === id)?.label ?? fallback;
}

/** Etiqueta desde mapa id→label (p. ej. opciones de select). */
export function mapOptionLabel(
  labelById: ReadonlyMap<string, string>,
  id: number,
  fallback = "—",
): string {
  return labelById.get(String(id)) ?? fallback;
}
