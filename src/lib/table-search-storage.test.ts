import { beforeEach, describe, expect, it } from "vitest";
import {
  clearAllStoredTableSearches,
  clearStoredTableFilter,
  clearStoredTableFilters,
  clearStoredTablePage,
  clearStoredTableSearch,
  cleanupStoredTableSearches,
  getStoredTableFilter,
  getStoredTableFilters,
  getStoredTablePage,
  getStoredTableSearch,
  hasStoredTableFilter,
  isPathInSection,
  setStoredTableFilter,
  setStoredTablePage,
  setStoredTableSearch,
} from "./table-search-storage";

class MockStorage {
  private store = new Map<string, string>();

  get length(): number {
    return this.store.size;
  }

  key(index: number): string | null {
    const keys = Array.from(this.store.keys());
    return keys[index] ?? null;
  }

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}

describe("table-search-storage", () => {
  let mockStorage: MockStorage;

  beforeEach(() => {
    mockStorage = new MockStorage();
    Object.defineProperty(globalThis, "window", {
      value: { sessionStorage: mockStorage },
      writable: true,
      configurable: true,
    });
    clearAllStoredTableSearches();
  });

  describe("isPathInSection", () => {
    it("matches exact section path", () => {
      expect(isPathInSection("/printers", "/printers")).toBe(true);
      expect(isPathInSection("/branches", "/branches")).toBe(true);
      expect(isPathInSection("/", "/")).toBe(true);
    });

    it("matches nested subroutes of section", () => {
      expect(isPathInSection("/printers/42", "/printers")).toBe(true);
      expect(isPathInSection("/printers/42/enajenar", "/printers")).toBe(true);
      expect(isPathInSection("/branches/10", "/branches")).toBe(true);
    });

    it("does not match different sections or sibling prefixes", () => {
      expect(isPathInSection("/branches", "/printers")).toBe(false);
      expect(isPathInSection("/printers-other", "/printers")).toBe(false);
      expect(isPathInSection("/printer-models", "/printers")).toBe(false);
      expect(isPathInSection("/", "/printers")).toBe(false);
    });
  });

  describe("getStoredTableSearch and setStoredTableSearch", () => {
    it("returns empty string by default", () => {
      expect(getStoredTableSearch("/printers")).toBe("");
    });

    it("stores and retrieves search query", () => {
      setStoredTableSearch("/printers", "kinpe");
      expect(getStoredTableSearch("/printers")).toBe("kinpe");
    });

    it("clears search query when empty string or whitespace is stored", () => {
      setStoredTableSearch("/printers", "kinpe");
      setStoredTableSearch("/printers", "");
      expect(getStoredTableSearch("/printers")).toBe("");

      setStoredTableSearch("/printers", "kinpe");
      setStoredTableSearch("/printers", "   ");
      expect(getStoredTableSearch("/printers")).toBe("");
    });

    it("clears specific section via clearStoredTableSearch", () => {
      setStoredTableSearch("/printers", "kinpe");
      setStoredTableSearch("/branches", "acme");
      clearStoredTableSearch("/printers");
      expect(getStoredTableSearch("/printers")).toBe("");
      expect(getStoredTableSearch("/branches")).toBe("acme");
    });
  });

  describe("getStoredTableFilter and setStoredTableFilter", () => {
    it("returns null by default", () => {
      expect(getStoredTableFilter("/printers", "status")).toBe(null);
      expect(hasStoredTableFilter("/printers", "status")).toBe(false);
    });

    it("stores and retrieves filter values", () => {
      setStoredTableFilter("/printers", "status", "enajenada");
      expect(getStoredTableFilter("/printers", "status")).toBe("enajenada");
      expect(hasStoredTableFilter("/printers", "status")).toBe(true);

      setStoredTableFilter("/printers", "serial", "ABC-123");
      expect(getStoredTableFilter("/printers", "serial")).toBe("ABC-123");
      expect(getStoredTableFilters("/printers")).toEqual({
        status: "enajenada",
        serial: "ABC-123",
      });
    });

    it("clears individual filter key when null or empty", () => {
      setStoredTableFilter("/printers", "status", "enajenada");
      setStoredTableFilter("/printers", "status", null);
      expect(getStoredTableFilter("/printers", "status")).toBe(null);

      setStoredTableFilter("/printers", "status", "enajenada");
      clearStoredTableFilter("/printers", "status");
      expect(getStoredTableFilter("/printers", "status")).toBe(null);
    });

    it("clears all filters for a section via clearStoredTableFilters", () => {
      setStoredTableFilter("/printers", "status", "enajenada");
      setStoredTableFilter("/printers", "serial", "ABC");
      setStoredTableFilter("/branches", "state", "Miranda");

      clearStoredTableFilters("/printers");
      expect(getStoredTableFilter("/printers", "status")).toBe(null);
      expect(getStoredTableFilter("/printers", "serial")).toBe(null);
      expect(getStoredTableFilter("/branches", "state")).toBe("Miranda");
    });
  });

  describe("cleanupStoredTableSearches", () => {
    it("preserves searches within the active section and clears others", () => {
      setStoredTableSearch("/printers", "kinpe");
      setStoredTableSearch("/branches", "acme");

      // User navigates to a printer detail page (/printers/15)
      cleanupStoredTableSearches("/printers/15");

      // /printers is preserved because /printers/15 belongs to /printers
      expect(getStoredTableSearch("/printers")).toBe("kinpe");
      // /branches is cleared because user is not in /branches
      expect(getStoredTableSearch("/branches")).toBe("");
    });

    it("clears section search when leaving section completely", () => {
      setStoredTableSearch("/printers", "kinpe");

      // User leaves /printers and navigates to /branches
      cleanupStoredTableSearches("/branches");

      expect(getStoredTableSearch("/printers")).toBe("");
    });

    it("faithfully reproduces the user's printer selection and return scenario with filters", () => {
      // 1. User is on /printers, filters by "enajenada", types "kinpe", and navigates to page 3
      setStoredTableFilter("/printers", "status", "enajenada");
      setStoredTableSearch("/printers", "kinpe");
      setStoredTablePage("/printers", 3);

      expect(getStoredTableFilter("/printers", "status")).toBe("enajenada");
      expect(getStoredTableSearch("/printers")).toBe("kinpe");
      expect(getStoredTablePage("/printers")).toBe(3);

      // 2. User clicks printer element, navigating to /printers/14
      cleanupStoredTableSearches("/printers/14");

      // Filter, search and page are retained while viewing printer detail
      expect(getStoredTableFilter("/printers", "status")).toBe("enajenada");
      expect(getStoredTableSearch("/printers")).toBe("kinpe");
      expect(getStoredTablePage("/printers")).toBe(3);

      // 3. User returns to /printers table
      cleanupStoredTableSearches("/printers");

      // Filter, search and page still remain active
      expect(getStoredTableFilter("/printers", "status")).toBe("enajenada");
      expect(getStoredTableSearch("/printers")).toBe("kinpe");
      expect(getStoredTablePage("/printers")).toBe(3);

      // 4. User navigates out of impresoras (e.g. to /branches)
      cleanupStoredTableSearches("/branches");

      // Filter, search and page for /printers are now reset
      expect(getStoredTableFilter("/printers", "status")).toBe(null);
      expect(getStoredTableSearch("/printers")).toBe("");
      expect(getStoredTablePage("/printers")).toBe(null);
    });

    it("preserves searches across subroutes of all core sections", () => {
      const sections = [
        { section: "/branches", subpath: "/branches/10" },
        { section: "/reviews", subpath: "/reviews/clients/5" },
        { section: "/contracts", subpath: "/contracts/distributor/2" },
        { section: "/seals", subpath: "/seals/8" },
        { section: "/technical-services", subpath: "/technical-services/3" },
        { section: "/annual-inspections", subpath: "/annual-inspections/9" },
        { section: "/printer-models", subpath: "/printer-models/4" },
        { section: "/firmware-versions", subpath: "/firmware-versions/1" },
        { section: "/users", subpath: "/users/12" },
      ];

      for (const { section, subpath } of sections) {
        setStoredTableSearch(section, "query-test");
        setStoredTablePage(section, 2);
        setStoredTableFilter(section, "filter-key", "filter-val");

        cleanupStoredTableSearches(subpath);
        expect(getStoredTableSearch(section)).toBe("query-test");
        expect(getStoredTablePage(section)).toBe(2);
        expect(getStoredTableFilter(section, "filter-key")).toBe("filter-val");

        // Leaving section
        cleanupStoredTableSearches("/other-section");
        expect(getStoredTableSearch(section)).toBe("");
        expect(getStoredTablePage(section)).toBe(null);
        expect(getStoredTableFilter(section, "filter-key")).toBe(null);
      }
    });
  });

  describe("getStoredTablePage and setStoredTablePage", () => {
    it("returns null by default", () => {
      expect(getStoredTablePage("/printers")).toBe(null);
    });

    it("stores and retrieves page numbers", () => {
      setStoredTablePage("/printers", 4);
      expect(getStoredTablePage("/printers")).toBe(4);
    });

    it("clears page when set to <= 1", () => {
      setStoredTablePage("/printers", 4);
      setStoredTablePage("/printers", 1);
      expect(getStoredTablePage("/printers")).toBe(null);

      setStoredTablePage("/printers", 4);
      setStoredTablePage("/printers", 0);
      expect(getStoredTablePage("/printers")).toBe(null);
    });

    it("clears specific section page via clearStoredTablePage", () => {
      setStoredTablePage("/printers", 3);
      setStoredTablePage("/branches", 5);
      clearStoredTablePage("/printers");
      expect(getStoredTablePage("/printers")).toBe(null);
      expect(getStoredTablePage("/branches")).toBe(5);
    });
  });
});
