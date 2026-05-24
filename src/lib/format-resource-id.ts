/** Muestra un ID de recurso sin prefijo numeral (#). */
export function formatResourceId(id: number | string | null | undefined): string {
  if (id == null || id === "") return "—";
  return String(id);
}
