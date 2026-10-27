import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  ACTIVITY_COOKIE_NAME,
  ACTIVITY_STORAGE_KEY,
  INACTIVITY_TIMEOUT_MS,
  INACTIVITY_WARNING_MS,
  TOTAL_INACTIVITY_TIMEOUT_MS,
  clearLastActivity,
  getInactivityStatus,
  getLastActivityTimestamp,
  isSessionExpiredByInactivity,
  recordLastActivity,
  warningSecondsRemaining,
} from "@/lib/inactivity-timeout";

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

describe("inactivity-timeout", () => {
  let mockLocalStorage: MockStorage;
  let mockCookieStore = "";

  beforeEach(() => {
    mockLocalStorage = new MockStorage();
    mockCookieStore = "";

    Object.defineProperty(globalThis, "window", {
      value: {
        localStorage: mockLocalStorage,
        location: { protocol: "http:" },
      },
      writable: true,
      configurable: true,
    });

    Object.defineProperty(globalThis, "localStorage", {
      value: mockLocalStorage,
      writable: true,
      configurable: true,
    });

    Object.defineProperty(globalThis, "document", {
      value: {
        get cookie() {
          return mockCookieStore;
        },
        set cookie(val: string) {
          if (val.includes("Max-Age=0")) {
            mockCookieStore = "";
          } else {
            mockCookieStore = val.split(";")[0] ?? "";
          }
        },
      },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    // @ts-expect-error cleanup globals
    delete globalThis.window;
    // @ts-expect-error cleanup globals
    delete globalThis.localStorage;
    // @ts-expect-error cleanup globals
    delete globalThis.document;
  });

  describe("warningSecondsRemaining", () => {
    it("returns whole seconds until the deadline", () => {
      expect(warningSecondsRemaining(61_000, 0)).toBe(61);
      expect(warningSecondsRemaining(61_000, 1_500)).toBe(60);
      expect(warningSecondsRemaining(61_000, 60_500)).toBe(1);
      expect(warningSecondsRemaining(61_000, 61_000)).toBe(0);
      expect(warningSecondsRemaining(61_000, 62_000)).toBe(0);
    });
  });

  describe("getInactivityStatus", () => {
    const baseTime = 1_000_000;

    it("handles null lastActivity safely without expiring", () => {
      const status = getInactivityStatus(baseTime, null);
      expect(status.isExpired).toBe(false);
      expect(status.isInWarning).toBe(false);
      expect(status.remainingIdleMs).toBe(INACTIVITY_TIMEOUT_MS);
      expect(status.lastActivity).toBeNull();
    });

    it("reports normal idle when elapsed time is within 15 minutes", () => {
      const fiveMinutesMs = 5 * 60 * 1000;
      const status = getInactivityStatus(baseTime + fiveMinutesMs, baseTime);

      expect(status.isExpired).toBe(false);
      expect(status.isInWarning).toBe(false);
      expect(status.remainingIdleMs).toBe(10 * 60 * 1000);
      expect(status.lastActivity).toBe(baseTime);
    });

    it("reports warning when elapsed time is in the 60s warning period (between 15m and 16m)", () => {
      const fifteenAndHalfMinutes = 15 * 60 * 1000 + 30 * 1000;
      const status = getInactivityStatus(
        baseTime + fifteenAndHalfMinutes,
        baseTime,
      );

      expect(status.isExpired).toBe(false);
      expect(status.isInWarning).toBe(true);
      expect(status.warningSecondsLeft).toBe(30);
      expect(status.remainingIdleMs).toBe(0);
    });

    it("reports expired when elapsed time reaches or exceeds 16 minutes (even if tab was closed)", () => {
      const statusAt16m = getInactivityStatus(
        baseTime + TOTAL_INACTIVITY_TIMEOUT_MS,
        baseTime,
      );
      expect(statusAt16m.isExpired).toBe(true);
      expect(statusAt16m.isInWarning).toBe(false);

      const statusAt1Hour = getInactivityStatus(
        baseTime + 60 * 60 * 1000,
        baseTime,
      );
      expect(statusAt1Hour.isExpired).toBe(true);
      expect(statusAt1Hour.isInWarning).toBe(false);
    });
  });

  describe("storage and cookie persistence", () => {
    it("records and retrieves last activity timestamp from localStorage", () => {
      const now = 1_700_000_000;
      recordLastActivity(now);

      expect(mockLocalStorage.getItem(ACTIVITY_STORAGE_KEY)).toBe(String(now));
      expect(getLastActivityTimestamp()).toBe(now);
    });

    it("clears activity timestamp from localStorage and cookie", () => {
      recordLastActivity(1_700_000_000);
      expect(getLastActivityTimestamp()).not.toBeNull();

      clearLastActivity();
      expect(mockLocalStorage.getItem(ACTIVITY_STORAGE_KEY)).toBeNull();
      expect(getLastActivityTimestamp()).toBeNull();
    });

    it("correctly identifies expired session through isSessionExpiredByInactivity", () => {
      const pastTime = 1_000_000;
      recordLastActivity(pastTime);

      // A los 10 minutos no ha expirado
      expect(
        isSessionExpiredByInactivity(pastTime + 10 * 60 * 1000),
      ).toBe(false);

      // A los 20 minutos (pestaña cerrada o reabierta) ha expirado
      expect(
        isSessionExpiredByInactivity(pastTime + 20 * 60 * 1000),
      ).toBe(true);
    });
  });
});
