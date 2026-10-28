"use client";

import { useCallback, useState } from "react";
import { usePathname } from "next/navigation";
import {
  getStoredTableFilter,
  isPathInSection,
  setStoredTableFilter,
} from "@/lib/table-search-storage";

/**
 * Hook to manage a filter state for a table in a given section.
 * Persists the filter value as long as the user navigates within that section
 * (e.g. from `/printers` to `/printers/12` and back).
 * Resets when the user leaves the section.
 *
 * @param section Section path prefix (e.g. `/printers`)
 * @param filterKey Key identifying this filter within the section (e.g. `status`, `serial`)
 * @param initialDefault Default initial filter value if none stored (defaults to `"all"`)
 */
export function useTableFilter(
  section: string,
  filterKey: string,
  initialDefault?: string,
): [string, (value: string | ((prev: string) => string)) => void];
export function useTableFilter<T extends string>(
  section: string,
  filterKey: string,
  initialDefault: T,
): [T, (value: T | ((prev: T) => T)) => void];
export function useTableFilter<T extends string = string>(
  section: string,
  filterKey: string,
  initialDefault: T = "all" as T,
): [T, (value: T | ((prev: T) => T)) => void] {
  const pathname = usePathname();

  const [filter, setFilterState] = useState<T>(() => {
    if (pathname && !isPathInSection(pathname, section)) {
      return initialDefault;
    }
    const stored = getStoredTableFilter(section, filterKey);
    return stored != null ? (stored as T) : initialDefault;
  });

  const setFilter = useCallback(
    (value: T | ((prev: T) => T)) => {
      setFilterState((prev) => {
        const next =
          typeof value === "function" ? (value as (prev: T) => T)(prev) : value;
        setStoredTableFilter(section, filterKey, next);
        return next;
      });
    },
    [section, filterKey],
  );

  return [filter, setFilter];
}
