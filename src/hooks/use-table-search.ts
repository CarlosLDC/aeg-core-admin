"use client";

import { useCallback, useState } from "react";
import { usePathname } from "next/navigation";
import {
  getStoredTableSearch,
  isPathInSection,
  setStoredTableSearch,
} from "@/lib/table-search-storage";

/**
 * Hook to manage search bar state for a table in a given section.
 * Persists the search query as long as the user navigates within that section
 * (e.g. from `/printers` to `/printers/12` and back).
 * Resets when the user leaves the section.
 *
 * @param section Section path prefix (e.g. `/printers`)
 * @param initialDefault Default initial query if none stored (defaults to empty string)
 */
export function useTableSearch(
  section: string,
  initialDefault = "",
): [string, (value: string | ((prev: string) => string)) => void] {
  const pathname = usePathname();

  const [search, setSearchState] = useState<string>(() => {
    if (pathname && !isPathInSection(pathname, section)) {
      return initialDefault;
    }
    const stored = getStoredTableSearch(section);
    return stored != null && stored !== "" ? stored : initialDefault;
  });

  const setSearch = useCallback(
    (value: string | ((prev: string) => string)) => {
      setSearchState((prev) => {
        const next = typeof value === "function" ? value(prev) : value;
        setStoredTableSearch(section, next);
        return next;
      });
    },
    [section],
  );

  return [search, setSearch];
}
