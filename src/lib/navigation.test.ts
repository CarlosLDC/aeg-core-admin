import { describe, expect, it } from "vitest";
import { ROLES } from "@/types/user";
import { FISCAL_BOOK_ENTRY_PATH } from "@/lib/safe-redirect";
import {
  activeNavHref,
  isNavItemActive,
  mainNav,
  navItemsForRole,
  navSectionsForRole,
} from "./navigation";

describe("navSectionsForRole", () => {
  it.each(["ADMIN", "DISTRIBUTOR"] as const)(
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

  it("hides modelos, firmware and precintos sections from distributor panel roles", () => {
    const items = navItemsForRole("DISTRIBUTOR");
    expect(items.some((i) => i.title === "Modelos fiscales")).toBe(false);
    expect(items.some((i) => i.title === "Versiones de firmware")).toBe(false);
    expect(items.some((i) => i.title === "Precintos fiscales")).toBe(false);
    expect(items.some((i) => i.title === "Servicio técnico")).toBe(false);
    expect(items.some((i) => i.title === "Inspección anual")).toBe(false);

    const adminItems = navItemsForRole("ADMIN");
    expect(adminItems.some((i) => i.title === "Modelos fiscales")).toBe(true);
    expect(adminItems.some((i) => i.title === "Versiones de firmware")).toBe(
      true,
    );
    expect(adminItems.some((i) => i.title === "Precintos fiscales")).toBe(true);
    expect(adminItems.some((i) => i.title === "Servicio técnico")).toBe(true);
    expect(adminItems.some((i) => i.title === "Inspección anual")).toBe(true);
  });

  it("shows Libro fiscal for DISTRIBUTOR via admin handoff path", () => {
    const items = navItemsForRole("DISTRIBUTOR");
    const fiscalBook = items.find((i) => i.title === "Libro fiscal");
    expect(fiscalBook?.href).toBe(FISCAL_BOOK_ENTRY_PATH);
    expect(fiscalBook?.openInNewTab).toBe(true);
    expect(items.some((i) => i.title === "Clientes")).toBe(false);
    expect(items.some((i) => i.title === "Empresas")).toBe(true);
    expect(navItemsForRole("SENIAT").some((i) => i.title === "Libro fiscal")).toBe(
      false,
    );
  });

  it("shows Tools for every role", () => {
    for (const role of ROLES) {
      expect(navItemsForRole(role).some((i) => i.href === "/tools")).toBe(true);
    }
  });

  it("hides panel navigation from service center technicians except Tools", () => {
    expect(navItemsForRole("TECHNICIAN")).toEqual([
      expect.objectContaining({ href: "/tools" }),
    ]);
    expect(navItemsForRole("SERVICE_CENTER")).toEqual([
      expect.objectContaining({ href: "/tools" }),
    ]);
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

  it("highlights nested Tools routes under /tools", () => {
    expect(activeNavHref("/tools/printers/ABC1234567", adminItems)).toBe("/tools");
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
