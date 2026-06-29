import { describe, expect, it, vi, afterEach } from "vitest";
import * as auth from "@/lib/auth";
import { FISCAL_BOOKS_APP_URL } from "@/lib/fiscal-books-app";
import {
  adminPathToFiscalBooksTarget,
  completeFiscalBooksHandoffFromAdmin,
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
    const url = new URL(fiscalBooksHandoffUrl("/", "jwt.token+sig", true));
    expect(url.origin + url.pathname).toBe(
      `${FISCAL_BOOKS_APP_URL}/auth/handoff`,
    );
    const hash = url.hash.replace(/^#/, "");
    expect(hash).toContain("token=jwt.token%2Bsig");
    expect(hash).toContain("remember=1");
  });

  it("includes next path when not root", () => {
    const url = new URL(
      fiscalBooksHandoffUrl("/fiscal-book/7", "jwt-token", false),
    );
    expect(url.hash).toContain("next=%2Ffiscal-book%2F7");
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

describe("completeFiscalBooksHandoffFromAdmin", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("keeps admin session for panel users opening the libro fiscal", () => {
    const replace = vi.fn();
    vi.stubGlobal("window", { location: { replace } });
    const logoutSpy = vi.spyOn(auth, "logout").mockImplementation(() => {});

    completeFiscalBooksHandoffFromAdmin({
      token: "jwt-token",
      remember: false,
      pathSegments: ["42"],
      clearAdminSession: false,
    });

    expect(logoutSpy).not.toHaveBeenCalled();
    expect(replace).toHaveBeenCalledTimes(1);
    expect(String(replace.mock.calls[0][0])).toContain("next=%2Ffiscal-book%2F42");
  });
});
