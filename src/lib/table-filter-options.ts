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
