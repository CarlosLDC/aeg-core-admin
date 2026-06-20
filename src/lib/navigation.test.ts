import { describe, expect, it } from "vitest";
import { FISCAL_BOOKS_APP_URL } from "@/lib/fiscal-books-app";
import {
  activeNavHref,
  isNavItemActive,
  mainNav,
  navItemsForRole,
  navSectionsForRole,
} from "./navigation";

describe("navSectionsForRole", () => {
  it.each(["ADMIN", "TECHNICIAN"] as const)(
    "places Organización before Operaciones for %s",
    (role) => {
      const titles = navSectionsForRole(role).map((s) => s.title);
      expect(titles.indexOf("Organización")).toBeGreaterThan(-1);
      expect(titles.indexOf("Operaciones")).toBeGreaterThan(-1);
      expect(titles.indexOf("Organización")).toBeLessThan(
        titles.indexOf("Operaciones"),
      );
    },
  );

  it("keeps Administración after Operaciones for ADMIN", () => {
    const titles = navSectionsForRole("ADMIN").map((s) => s.title);
    expect(titles.indexOf("Operaciones")).toBeLessThan(
      titles.indexOf("Administración"),
    );
  });

  it("shows Libro fiscal for panel roles with external app URL", () => {
    const technicianItems = navItemsForRole("TECHNICIAN");
    const fiscalBook = technicianItems.find((i) => i.title === "Libro fiscal");
    expect(fiscalBook?.href).toBe(FISCAL_BOOKS_APP_URL);
    expect(navItemsForRole("TECHNICIAN").some((i) => i.title === "Libro fiscal")).toBe(
      true,
    );
    expect(navItemsForRole("SENIAT").some((i) => i.title === "Libro fiscal")).toBe(
      false,
    );
  });
});

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
