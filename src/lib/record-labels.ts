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

/** Nombre del técnico: catálogo si está en alcance; si no, datos del API. */
export function technicalServiceTechnicianLabel(
  service: {
    userId: number;
    technicianName?: string | null;
    technicianNationalId?: string | null;
  },
  options: Array<{ value: string; label: string }>,
  fallback = "—",
): string {
  const fromCatalog = catalogOptionLabel(options, service.userId, "");
  if (fromCatalog) return fromCatalog;
  const name = service.technicianName?.trim();
  if (!name) return fallback;
  const cedula = service.technicianNationalId?.trim();
  return cedula ? `${name} · ${cedula}` : name;
}
