import { describe, expect, it } from "vitest";
import {
  canAccessFiscalBooksApp,
  fiscalBooksAppUrl,
  FISCAL_BOOKS_APP_URL,
  isExternalNavHref,
} from "@/lib/fiscal-books-app";
import { FISCAL_BOOK_ENTRY_PATH } from "@/lib/safe-redirect";

describe("fiscalBooksAppUrl", () => {
  it("returns the admin handoff entry path", () => {
    expect(fiscalBooksAppUrl()).toBe(FISCAL_BOOK_ENTRY_PATH);
  });

  it("deep-links to a printer book via handoff", () => {
    expect(fiscalBooksAppUrl(42)).toBe(`${FISCAL_BOOK_ENTRY_PATH}/42`);
  });
});

describe("canAccessFiscalBooksApp", () => {
  it("allows fiscal book roles", () => {
    expect(canAccessFiscalBooksApp("ADMIN")).toBe(true);
    expect(canAccessFiscalBooksApp("DISTRIBUTOR")).toBe(true);
    expect(canAccessFiscalBooksApp("TECHNICIAN")).toBe(true);
    expect(canAccessFiscalBooksApp("SERVICE_CENTER")).toBe(true);
  });

  it("denies SENIAT", () => {
    expect(canAccessFiscalBooksApp("SENIAT")).toBe(false);
  });
});

describe("isExternalNavHref", () => {
  it("detects absolute URLs", () => {
    expect(isExternalNavHref(FISCAL_BOOKS_APP_URL)).toBe(true);
    expect(isExternalNavHref("/fiscal-book")).toBe(false);
  });
});
