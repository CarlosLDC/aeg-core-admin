import { beforeEach, describe, expect, it } from "vitest";
import {
  clearStoredToolsTableState,
  DEFAULT_TOOLS_PAGE_SIZE,
  DEFAULT_TOOLS_SORT,
  readStoredToolsTableState,
  saveStoredToolsTableState,
  TOOLS_TABLE_STORAGE_KEY,
  type ToolsTableState,
} from "./tools-printers-context";

class MockStorage {
  private store = new Map<string, string>();

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

describe("tools-printers-context storage", () => {
  let mockStorage: MockStorage;

  beforeEach(() => {
    mockStorage = new MockStorage();
    Object.defineProperty(globalThis, "window", {
      value: { sessionStorage: mockStorage },
      writable: true,
      configurable: true,
    });
  });

  it("reads null when storage is empty", () => {
    expect(readStoredToolsTableState()).toBeNull();
  });

  it("saves and reads valid table state", () => {
    const state: ToolsTableState = {
      query: "STC POS",
      statusBucket: "enajenada",
      distributorFilter: "enajenada",
      adminStatusFilter: "enajenada",
      sort: { key: "serial", direction: "desc" },
      page: 2,
      pageSize: 10,
    };

    saveStoredToolsTableState(state);
    expect(mockStorage.getItem(TOOLS_TABLE_STORAGE_KEY)).toBe(
      JSON.stringify(state),
    );

    const loaded = readStoredToolsTableState();
    expect(loaded).toEqual(state);
  });

  it("clears stored table state", () => {
    saveStoredToolsTableState({
      query: "STC POS",
      statusBucket: "all",
      distributorFilter: "all",
      adminStatusFilter: "all",
      sort: DEFAULT_TOOLS_SORT,
      page: 2,
      pageSize: DEFAULT_TOOLS_PAGE_SIZE,
    });

    clearStoredToolsTableState();
    expect(mockStorage.getItem(TOOLS_TABLE_STORAGE_KEY)).toBeNull();
    expect(readStoredToolsTableState()).toBeNull();
  });

  it("sanitizes invalid or corrupted state gracefully", () => {
    mockStorage.setItem(
      TOOLS_TABLE_STORAGE_KEY,
      JSON.stringify({
        query: 12345, // invalid type
        statusBucket: "invalid_bucket",
        distributorFilter: "invalid_distributor_status",
        adminStatusFilter: "invalid_admin_status",
        sort: { key: "unknown", direction: "random" },
        page: -5,
        pageSize: 0,
      }),
    );

    const loaded = readStoredToolsTableState();
    expect(loaded).toEqual({});
  });

  it("handles malformed JSON without throwing", () => {
    mockStorage.setItem(TOOLS_TABLE_STORAGE_KEY, "{not-json");
    expect(readStoredToolsTableState()).toBeNull();
  });
});
