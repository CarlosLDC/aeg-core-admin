import { normalizeStateName } from "@/lib/state-label";

export const FILTER_ALL = "all" as const;

export function filterAllOption(label = "Todos"): { value: string; label: string } {
  return { value: FILTER_ALL, label };
}

export function uniqueFilterOptions(
  values: Iterable<string>,
  labelFor: (value: string) => string = (v) => v,
): { value: string; label: string }[] {
  const seen = new Set<string>();
  const options: { value: string; label: string }[] = [];
  for (const raw of values) {
    const value = raw.trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    options.push({ value, label: labelFor(value) });
  }
  return options.sort((a, b) => a.label.localeCompare(b.label, "es"));
}

/** Opciones de estado sin duplicados por mayúsculas (p. ej. BOLÍVAR vs Bolívar). */
export function uniqueStateFilterOptions(
  values: Iterable<string>,
): { value: string; label: string; searchText: string }[] {
  const byKey = new Map<string, string>();

  for (const raw of values) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const label = normalizeStateName(trimmed);
    const key = label.toLocaleLowerCase("es");
    if (!byKey.has(key)) {
      byKey.set(key, label);
    }
  }

  return [...byKey.values()]
    .map((label) => ({ value: label, label, searchText: label }))
    .sort((a, b) => a.label.localeCompare(b.label, "es"));
}
