import { describe, expect, it } from "vitest";
import {
  activeNavHref,
  isNavItemActive,
  mainNav,
  navItemsForRole,
} from "./navigation";

describe("activeNavHref", () => {
  const adminItems = navItemsForRole("ADMIN");

  it("highlights settings on /settings/permissions (not in main nav)", () => {
    expect(activeNavHref("/settings/permissions", adminItems)).toBe("/settings");
    const settings = adminItems.find((i) => i.href === "/settings")!;
    expect(isNavItemActive(settings, "/settings/permissions", adminItems)).toBe(
      true,
    );
    expect(
      adminItems.some((i) => i.href === "/settings/permissions"),
    ).toBe(false);
  });

  it("highlights settings on /settings only", () => {
    expect(activeNavHref("/settings", adminItems)).toBe("/settings");
  });

  it("highlights printer detail under /printers", () => {
    expect(activeNavHref("/printers/abc-123", adminItems)).toBe("/printers");
  });

  it("does not treat /printer-models as /printers", () => {
    expect(activeNavHref("/printer-models", adminItems)).toBe("/printer-models");
    expect(activeNavHref("/printer-models/x", adminItems)).toBe("/printer-models");
  });

  it("highlights dashboard only on /", () => {
    expect(activeNavHref("/", adminItems)).toBe("/");
    expect(activeNavHref("/printers", mainNav)).toBe("/printers");
  });
});
