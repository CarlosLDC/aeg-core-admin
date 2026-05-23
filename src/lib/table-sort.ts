export type SortDirection = "asc" | "desc";

export type TableSortState<Key extends string> = {
  key: Key;
  direction: SortDirection;
} | null;

export function toggleTableSort<Key extends string>(
  current: TableSortState<Key>,
  key: Key,
): TableSortState<Key> {
  if (!current || current.key !== key) {
    return { key, direction: "desc" };
  }
  return {
    key,
    direction: current.direction === "desc" ? "asc" : "desc",
  };
}

export function sortTableRows<T, Key extends string>(
  rows: T[],
  sort: TableSortState<Key>,
  comparators: Partial<Record<Key, (a: T, b: T) => number>>,
): T[] {
  if (!sort) return rows;
  const comparator = comparators[sort.key];
  if (!comparator) return rows;
  const sortedRows = [...rows].sort(comparator);
  return sort.direction === "asc" ? sortedRows : sortedRows.reverse();
}

export function compareNumberValues(
  a: number | null | undefined,
  b: number | null | undefined,
) {
  const left = a ?? Number.NEGATIVE_INFINITY;
  const right = b ?? Number.NEGATIVE_INFINITY;
  return left - right;
}

export function compareDateValues(
  a: string | null | undefined,
  b: string | null | undefined,
) {
  const left = a ? Date.parse(a) : Number.NEGATIVE_INFINITY;
  const right = b ? Date.parse(b) : Number.NEGATIVE_INFINITY;
  return left - right;
}
