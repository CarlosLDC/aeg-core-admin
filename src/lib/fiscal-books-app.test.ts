import { describe, expect, it } from "vitest";
import {
  canAccessFiscalBooksApp,
  fiscalBooksAppUrl,
  FISCAL_BOOKS_APP_URL,
  isExternalNavHref,
} from "@/lib/fiscal-books-app";

describe("fiscalBooksAppUrl", () => {
  it("returns the app root", () => {
    expect(fiscalBooksAppUrl()).toBe(FISCAL_BOOKS_APP_URL);
  });

  it("deep-links to a printer book", () => {
    expect(fiscalBooksAppUrl(42)).toBe(
      `${FISCAL_BOOKS_APP_URL}/fiscal-book/42`,
    );
  });
});

describe("canAccessFiscalBooksApp", () => {
  it("allows field ops roles", () => {
    expect(canAccessFiscalBooksApp("ADMIN")).toBe(true);
    expect(canAccessFiscalBooksApp("TECHNICIAN")).toBe(true);
    expect(canAccessFiscalBooksApp("SERVICE_CENTER")).toBe(true);
  });

  it("denies distributor", () => {
    expect(canAccessFiscalBooksApp("DISTRIBUTOR")).toBe(false);
  });
});

describe("isExternalNavHref", () => {
  it("detects absolute URLs", () => {
    expect(isExternalNavHref(FISCAL_BOOKS_APP_URL)).toBe(true);
    expect(isExternalNavHref("/fiscal-book")).toBe(false);
  });
});
