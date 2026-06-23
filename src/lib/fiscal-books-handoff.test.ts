import { describe, expect, it } from "vitest";
import { FISCAL_BOOKS_APP_URL } from "@/lib/fiscal-books-app";
import {
  fiscalBooksHandoffUrl,
  fiscalBooksTargetPath,
} from "@/lib/fiscal-books-handoff";

describe("fiscalBooksTargetPath", () => {
  it("maps admin segments to libro routes", () => {
    expect(fiscalBooksTargetPath()).toBe("/");
    expect(fiscalBooksTargetPath(["42"])).toBe("/fiscal-book/42");
    expect(fiscalBooksTargetPath(["42", "new-service"])).toBe(
      "/fiscal-book/42/new-service",
    );
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
