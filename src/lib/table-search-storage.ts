const STORAGE_PREFIX = "aeg_table_search:";

const memoryFallback = new Map<string, string>();

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
 * Removes stored searches for any section that the user is not currently in.
 */
export function cleanupStoredTableSearches(currentPathname: string): void {
  for (const section of Array.from(memoryFallback.keys())) {
    if (!isPathInSection(currentPathname, section)) {
      memoryFallback.delete(section);
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
      }
    }
    for (const key of keysToRemove) {
      window.sessionStorage.removeItem(key);
    }
  } catch {
    // Ignore storage errors
  }
}

/**
 * Clears all stored table searches across all sections.
 */
export function clearAllStoredTableSearches(): void {
  memoryFallback.clear();
  if (!isStorageAvailable()) return;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < window.sessionStorage.length; i++) {
      const key = window.sessionStorage.key(i);
      if (key && key.startsWith(STORAGE_PREFIX)) {
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
