const STORAGE_PREFIX = "aeg_table_search:";
const PAGE_STORAGE_PREFIX = "aeg_table_page:";
const FILTER_STORAGE_PREFIX = "aeg_table_filters:";

const memoryFallback = new Map<string, string>();
const pageMemoryFallback = new Map<string, number>();
const filterMemoryFallback = new Map<string, Record<string, string>>();

function isStorageAvailable(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const testKey = "__aeg_table_storage_test__";
    window.sessionStorage.setItem(testKey, "1");
    window.sessionStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Checks whether a given pathname belongs to a section.
 * Example:
 *   isPathInSection("/printers/42", "/printers") === true
 *   isPathInSection("/printers", "/printers") === true
 *   isPathInSection("/branches", "/printers") === false
 *   isPathInSection("/printers-other", "/printers") === false
 */
export function isPathInSection(pathname: string, section: string): boolean {
  if (!pathname || !section) return false;

  const normPath = pathname === "/" ? "/" : pathname.replace(/\/+$/, "");
  const normSection = section === "/" ? "/" : section.replace(/\/+$/, "");

  if (normSection === "/") {
    return normPath === "/";
  }

  return normPath === normSection || normPath.startsWith(`${normSection}/`);
}

/**
 * Retrieves the stored search query for a section.
 */
export function getStoredTableSearch(section: string): string {
  if (isStorageAvailable()) {
    try {
      const val = window.sessionStorage.getItem(`${STORAGE_PREFIX}${section}`);
      if (val != null) return val;
    } catch {
      // Ignore storage errors and fall back to memory
    }
  }
  return memoryFallback.get(section) ?? "";
}

/**
 * Stores or updates the search query for a section.
 * If query is empty, removes it.
 */
export function setStoredTableSearch(section: string, query: string): void {
  const value = query.trim();
  if (!value) {
    clearStoredTableSearch(section);
    return;
  }

  memoryFallback.set(section, query);
  if (isStorageAvailable()) {
    try {
      window.sessionStorage.setItem(`${STORAGE_PREFIX}${section}`, query);
    } catch {
      // Ignore storage errors
    }
  }
}

/**
 * Clears the stored search query for a specific section.
 */
export function clearStoredTableSearch(section: string): void {
  memoryFallback.delete(section);
  if (isStorageAvailable()) {
    try {
      window.sessionStorage.removeItem(`${STORAGE_PREFIX}${section}`);
    } catch {
      // Ignore storage errors
    }
  }
}

/**
 * Retrieves the stored page number for a section.
 */
export function getStoredTablePage(section: string): number | null {
  if (isStorageAvailable()) {
    try {
      const val = window.sessionStorage.getItem(`${PAGE_STORAGE_PREFIX}${section}`);
      if (val != null) {
        const num = Number.parseInt(val, 10);
        if (Number.isFinite(num) && num >= 1) return num;
      }
    } catch {
      // Ignore storage errors and fall back to memory
    }
  }
  const fallback = pageMemoryFallback.get(section);
  return fallback != null && fallback >= 1 ? fallback : null;
}

/**
 * Stores or updates the page number for a section.
 * If page <= 1, removes it (defaults to 1).
 */
export function setStoredTablePage(section: string, page: number): void {
  if (!Number.isFinite(page) || page <= 1) {
    clearStoredTablePage(section);
    return;
  }

  pageMemoryFallback.set(section, page);
  if (isStorageAvailable()) {
    try {
      window.sessionStorage.setItem(`${PAGE_STORAGE_PREFIX}${section}`, String(page));
    } catch {
      // Ignore storage errors
    }
  }
}

/**
 * Clears the stored page number for a specific section.
 */
export function clearStoredTablePage(section: string): void {
  pageMemoryFallback.delete(section);
  if (isStorageAvailable()) {
    try {
      window.sessionStorage.removeItem(`${PAGE_STORAGE_PREFIX}${section}`);
    } catch {
      // Ignore storage errors
    }
  }
}

/**
 * Retrieves all stored table filters for a section.
 */
export function getStoredTableFilters(section: string): Record<string, string> {
  if (isStorageAvailable()) {
    try {
      const raw = window.sessionStorage.getItem(`${FILTER_STORAGE_PREFIX}${section}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          return { ...parsed };
        }
      }
    } catch {
      // Ignore storage errors and fall back to memory
    }
  }
  const fallback = filterMemoryFallback.get(section);
  return fallback ? { ...fallback } : {};
}

/**
 * Retrieves a specific stored table filter value for a section.
 */
export function getStoredTableFilter(section: string, filterKey: string): string | null {
  const filters = getStoredTableFilters(section);
  const val = filters[filterKey];
  return val != null ? String(val) : null;
}

/**
 * Checks whether a specific table filter is stored for a section.
 */
export function hasStoredTableFilter(section: string, filterKey: string): boolean {
  return getStoredTableFilter(section, filterKey) !== null;
}

/**
 * Saves all filters for a section.
 */
export function saveStoredTableFilters(
  section: string,
  filters: Record<string, string>,
): void {
  const cleanFilters: Record<string, string> = {};
  for (const [k, v] of Object.entries(filters)) {
    if (v != null && v !== "") {
      cleanFilters[k] = String(v);
    }
  }

  if (Object.keys(cleanFilters).length === 0) {
    clearStoredTableFilters(section);
    return;
  }

  filterMemoryFallback.set(section, cleanFilters);
  if (isStorageAvailable()) {
    try {
      window.sessionStorage.setItem(
        `${FILTER_STORAGE_PREFIX}${section}`,
        JSON.stringify(cleanFilters),
      );
    } catch {
      // Ignore storage errors
    }
  }
}

/**
 * Stores or updates a specific filter for a section.
 * If value is null, undefined, or empty, the filter key is removed.
 */
export function setStoredTableFilter(
  section: string,
  filterKey: string,
  value: string | null | undefined,
): void {
  const current = getStoredTableFilters(section);
  if (value == null || value === "") {
    delete current[filterKey];
  } else {
    current[filterKey] = String(value);
  }
  saveStoredTableFilters(section, current);
}

/**
 * Clears a specific filter for a section.
 */
export function clearStoredTableFilter(section: string, filterKey: string): void {
  setStoredTableFilter(section, filterKey, null);
}

/**
 * Clears all stored table filters for a specific section.
 */
export function clearStoredTableFilters(section: string): void {
  filterMemoryFallback.delete(section);
  if (isStorageAvailable()) {
    try {
      window.sessionStorage.removeItem(`${FILTER_STORAGE_PREFIX}${section}`);
    } catch {
      // Ignore storage errors
    }
  }
}

/**
 * Removes stored searches, page numbers, and filters for any section that the user is not currently in.
 */
export function cleanupStoredTableSearches(currentPathname: string): void {
  for (const section of Array.from(memoryFallback.keys())) {
    if (!isPathInSection(currentPathname, section)) {
      memoryFallback.delete(section);
    }
  }

  for (const section of Array.from(pageMemoryFallback.keys())) {
    if (!isPathInSection(currentPathname, section)) {
      pageMemoryFallback.delete(section);
    }
  }

  for (const section of Array.from(filterMemoryFallback.keys())) {
    if (!isPathInSection(currentPathname, section)) {
      filterMemoryFallback.delete(section);
    }
  }

  if (!isStorageAvailable()) return;

  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < window.sessionStorage.length; i++) {
      const key = window.sessionStorage.key(i);
      if (key && key.startsWith(STORAGE_PREFIX)) {
        const section = key.slice(STORAGE_PREFIX.length);
        if (!isPathInSection(currentPathname, section)) {
          keysToRemove.push(key);
        }
      } else if (key && key.startsWith(PAGE_STORAGE_PREFIX)) {
        const section = key.slice(PAGE_STORAGE_PREFIX.length);
        if (!isPathInSection(currentPathname, section)) {
          keysToRemove.push(key);
        }
      } else if (key && key.startsWith(FILTER_STORAGE_PREFIX)) {
        const section = key.slice(FILTER_STORAGE_PREFIX.length);
        if (!isPathInSection(currentPathname, section)) {
          keysToRemove.push(key);
        }
      }
    }
    for (const key of keysToRemove) {
      window.sessionStorage.removeItem(key);
    }
  } catch {
    // Ignore storage errors
  }
}

export const cleanupStoredTableState = cleanupStoredTableSearches;

/**
 * Clears all stored table searches, page numbers, and filters across all sections.
 */
export function clearAllStoredTableSearches(): void {
  memoryFallback.clear();
  pageMemoryFallback.clear();
  filterMemoryFallback.clear();
  if (!isStorageAvailable()) return;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < window.sessionStorage.length; i++) {
      const key = window.sessionStorage.key(i);
      if (
        key &&
        (key.startsWith(STORAGE_PREFIX) ||
          key.startsWith(PAGE_STORAGE_PREFIX) ||
          key.startsWith(FILTER_STORAGE_PREFIX))
      ) {
        keysToRemove.push(key);
      }
    }
    for (const key of keysToRemove) {
      window.sessionStorage.removeItem(key);
    }
  } catch {
    // Ignore storage errors
  }
}

export const clearAllStoredTableFilters = clearAllStoredTableSearches;
