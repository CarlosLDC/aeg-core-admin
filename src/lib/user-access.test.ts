import { describe, expect, it } from "vitest";
import {
  canAccessPanel,
  roleHasGlobalScope,
  userAccessKind,
  userBranchDisplayLabel,
  userCreateSuccessMessage,
  userFiscalBookWriteLabel,
  userPortalAccessLabel,
} from "@/lib/user-access";

describe("userAccessKind", () => {
  it("maps roles to access kinds", () => {
    expect(userAccessKind("ADMIN")).toBe("admin");
    expect(userAccessKind("SENIAT")).toBe("seniat");
    expect(userAccessKind("DISTRIBUTOR")).toBe("operativo");
  });
});

describe("userPortalAccessLabel", () => {
  it("distinguishes SENIAT from panel roles", () => {
    expect(userPortalAccessLabel("TECHNICIAN")).toBe("Panel + libro fiscal");
    expect(userPortalAccessLabel("SENIAT")).toBe("Solo libro fiscal");
  });
});

describe("userBranchDisplayLabel", () => {
  it("shows global labels for admin and SENIAT", () => {
    expect(userBranchDisplayLabel("ADMIN", null)).toBe("Global (administrador)");
    expect(userBranchDisplayLabel("SENIAT", null)).toBe("Global (auditoría)");
    expect(userBranchDisplayLabel("TECHNICIAN", "Acme · Caracas")).toBe(
      "Acme · Caracas",
    );
  });
});

describe("userCreateSuccessMessage", () => {
  it("mentions the correct portal on create", () => {
    expect(userCreateSuccessMessage("Ana", "SENIAT")).toMatch(/libro fiscal/i);
    expect(userCreateSuccessMessage("Ana", "ADMIN")).toMatch(/panel/i);
  });
});

describe("access helpers", () => {
  it("flags panel access and write scope", () => {
    expect(canAccessPanel("SENIAT")).toBe(false);
    expect(canAccessPanel("ADMIN")).toBe(true);
    expect(roleHasGlobalScope("DISTRIBUTOR")).toBe(false);
    expect(userFiscalBookWriteLabel("SENIAT")).toBe("Solo lectura");
    expect(userFiscalBookWriteLabel("ADMIN")).toBe("Escritura global");
  });
});
