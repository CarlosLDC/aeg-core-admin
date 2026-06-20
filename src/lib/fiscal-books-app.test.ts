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
  it("allows panel roles except SENIAT", () => {
    expect(canAccessFiscalBooksApp("ADMIN")).toBe(true);
    expect(canAccessFiscalBooksApp("TECHNICIAN")).toBe(true);
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
