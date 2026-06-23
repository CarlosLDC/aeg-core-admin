import { describe, expect, it, vi, afterEach } from "vitest";
import * as auth from "@/lib/auth";
import { FISCAL_BOOKS_APP_URL } from "@/lib/fiscal-books-app";
import {
  adminPathToFiscalBooksTarget,
  completeSeniatHandoffFromAdmin,
  fiscalBooksHandoffUrl,
  fiscalBooksTargetPath,
} from "@/lib/fiscal-books-handoff";
import { FISCAL_BOOK_ENTRY_PATH } from "@/lib/safe-redirect";

describe("fiscalBooksTargetPath", () => {
  it("maps admin segments to libro routes", () => {
    expect(fiscalBooksTargetPath()).toBe("/");
    expect(fiscalBooksTargetPath(["42"])).toBe("/fiscal-book/42");
    expect(fiscalBooksTargetPath(["42", "new-service"])).toBe(
      "/fiscal-book/42/new-service",
    );
  });
});

describe("adminPathToFiscalBooksTarget", () => {
  it("maps admin entry paths to libro routes", () => {
    expect(adminPathToFiscalBooksTarget(FISCAL_BOOK_ENTRY_PATH)).toBe("/");
    expect(adminPathToFiscalBooksTarget("/fiscal-book/9")).toBe("/fiscal-book/9");
  });
});

describe("fiscalBooksHandoffUrl", () => {
  it("builds handoff url with token in hash", () => {
    const url = new URL(fiscalBooksHandoffUrl("/", "jwt-token", true));
    expect(url.origin + url.pathname).toBe(
      `${FISCAL_BOOKS_APP_URL}/auth/handoff`,
    );
    const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
    expect(hash.get("token")).toBe("jwt-token");
    expect(hash.get("remember")).toBe("1");
    expect(hash.get("next")).toBeNull();
  });

  it("includes next path when not root", () => {
    const url = new URL(
      fiscalBooksHandoffUrl("/fiscal-book/7", "jwt-token", false),
    );
    const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
    expect(hash.get("next")).toBe("/fiscal-book/7");
    expect(hash.get("remember")).toBeNull();
  });
});

describe("completeSeniatHandoffFromAdmin", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("clears admin session before redirecting to libros", () => {
    const replace = vi.fn();
    vi.stubGlobal("window", { location: { replace } });
    const logoutSpy = vi.spyOn(auth, "logout").mockImplementation(() => {});

    completeSeniatHandoffFromAdmin({
      token: "jwt-token",
      remember: true,
    });

    expect(logoutSpy).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledTimes(1);
    expect(String(replace.mock.calls[0][0])).toContain("/auth/handoff");
  });
});
