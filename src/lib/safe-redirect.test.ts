import { describe, expect, it } from "vitest";
import {
  FISCAL_BOOK_ENTRY_PATH,
  getSafeRedirectPath,
  postLoginRedirectPath,
} from "@/lib/safe-redirect";

describe("postLoginRedirectPath", () => {
  it("sends SENIAT and service center technicians to the fiscal book entry", () => {
    expect(postLoginRedirectPath("SENIAT", "/users")).toBe(FISCAL_BOOK_ENTRY_PATH);
    expect(postLoginRedirectPath("SENIAT", null)).toBe(FISCAL_BOOK_ENTRY_PATH);
    expect(postLoginRedirectPath("TECHNICIAN", null)).toBe(FISCAL_BOOK_ENTRY_PATH);
  });

  it("respects safe redirect for panel roles", () => {
    expect(postLoginRedirectPath("ADMIN", "/printers")).toBe("/printers");
    expect(postLoginRedirectPath("DISTRIBUTOR", null)).toBe("/");
  });
});

describe("getSafeRedirectPath", () => {
  it("allows fiscal book entry path", () => {
    expect(getSafeRedirectPath("/fiscal-book")).toBe("/fiscal-book");
  });
});
