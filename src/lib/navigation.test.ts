import { describe, expect, it } from "vitest";
import {
  activeNavHref,
  isNavItemActive,
  mainNav,
  navItemsForRole,
} from "./navigation";

describe("activeNavHref", () => {
  const adminItems = navItemsForRole("ADMIN");

  it("highlights only permissions on /settings/permissions", () => {
    expect(activeNavHref("/settings/permissions", adminItems)).toBe(
      "/settings/permissions",
    );
    const permissions = adminItems.find((i) => i.href === "/settings/permissions")!;
    const settings = adminItems.find((i) => i.href === "/settings")!;
    expect(isNavItemActive(permissions, "/settings/permissions", adminItems)).toBe(
      true,
    );
    expect(isNavItemActive(settings, "/settings/permissions", adminItems)).toBe(
      false,
    );
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
