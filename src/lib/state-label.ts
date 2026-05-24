/** Etiqueta canónica para estados (p. ej. `BOLÍVAR` → `Bolívar`). */
export function normalizeStateName(state: string): string {
  const trimmed = state.trim();
  if (!trimmed) return trimmed;

  return trimmed
    .toLocaleLowerCase("es")
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toLocaleUpperCase("es") + word.slice(1))
    .join(" ");
}

export function statesMatch(a: string, b: string): boolean {
  const left = normalizeStateName(a).toLocaleLowerCase("es");
  const right = normalizeStateName(b).toLocaleLowerCase("es");
  return left.length > 0 && left === right;
}
