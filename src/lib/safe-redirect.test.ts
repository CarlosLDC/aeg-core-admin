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
  it("allows fiscal book entry path and query params", () => {
    expect(getSafeRedirectPath("/fiscal-book")).toBe("/fiscal-book");
    expect(getSafeRedirectPath("/printers?tab=all#details")).toBe(
      "/printers?tab=all#details",
    );
  });

  it("rejects auth flow paths to avoid redirect loops", () => {
    expect(getSafeRedirectPath("/login")).toBe("/");
    expect(getSafeRedirectPath("/accept-invite?token=abc")).toBe("/");
    expect(getSafeRedirectPath("/forgot-password")).toBe("/");
    expect(getSafeRedirectPath("/reset-password?token=abc")).toBe("/");
  });

  it("rejects protocol-relative URLs, backslashes, and control-character bypasses", () => {
    expect(getSafeRedirectPath("//evil.com")).toBe("/");
    expect(getSafeRedirectPath("/\\evil.com")).toBe("/");
    expect(getSafeRedirectPath("/\t/evil.com")).toBe("/");
    expect(getSafeRedirectPath("/\n/evil.com")).toBe("/");
    expect(getSafeRedirectPath("/\r/evil.com")).toBe("/");
    expect(getSafeRedirectPath("https://evil.com")).toBe("/");
    expect(getSafeRedirectPath("javascript:alert(1)")).toBe("/");
  });
});
