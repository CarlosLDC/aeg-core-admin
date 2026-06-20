import { describe, expect, it } from "vitest";
import {
  canAccessPanel,
  roleHasGlobalScope,
  userAccessKind,
  userCreateSuccessMessage,
  userFiscalBookWriteLabel,
  userPortalAccessLabel,
} from "@/lib/user-access";

describe("userAccessKind", () => {
  it("maps roles to access kinds", () => {
    expect(userAccessKind("ADMIN")).toBe("admin");
    expect(userAccessKind("SENIAT")).toBe("seniat");
    expect(userAccessKind("TECHNICIAN")).toBe("operativo");
  });
});

describe("userPortalAccessLabel", () => {
  it("distinguishes SENIAT from panel roles", () => {
    expect(userPortalAccessLabel("TECHNICIAN")).toBe("Panel + libro fiscal");
    expect(userPortalAccessLabel("SENIAT")).toBe("Solo libro fiscal");
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
    expect(canAccessPanel("TECHNICIAN")).toBe(true);
    expect(roleHasGlobalScope("TECHNICIAN")).toBe(false);
    expect(userFiscalBookWriteLabel("SENIAT")).toBe("Solo lectura");
    expect(userFiscalBookWriteLabel("ADMIN")).toBe("Escritura global");
  });
});
