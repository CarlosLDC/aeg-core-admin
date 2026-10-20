import { beforeEach, describe, expect, it } from "vitest";
import {
  clearAllStoredTableSearches,
  clearStoredTableSearch,
  cleanupStoredTableSearches,
  getStoredTableSearch,
  isPathInSection,
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

    it("faithfully reproduces the user's printer selection and return scenario", () => {
      // 1. User is on /printers and types "kinpe"
      setStoredTableSearch("/printers", "kinpe");
      expect(getStoredTableSearch("/printers")).toBe("kinpe");

      // 2. User clicks printer, navigating to /printers/14
      cleanupStoredTableSearches("/printers/14");
      // Search is retained while viewing printer detail
      expect(getStoredTableSearch("/printers")).toBe("kinpe");

      // 3. User returns to /printers table
      cleanupStoredTableSearches("/printers");
      // Search filter still remains
      expect(getStoredTableSearch("/printers")).toBe("kinpe");

      // 4. User navigates out of impresoras (e.g. to /branches)
      cleanupStoredTableSearches("/branches");
      // Search filter for /printers is now reset
      expect(getStoredTableSearch("/printers")).toBe("");
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
        cleanupStoredTableSearches(subpath);
        expect(getStoredTableSearch(section)).toBe("query-test");

        // Leaving section
        cleanupStoredTableSearches("/other-section");
        expect(getStoredTableSearch(section)).toBe("");
      }
    });
  });
});
