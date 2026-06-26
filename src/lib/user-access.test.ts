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
    expect(userAccessKind("DISTRIBUTOR")).toBe("operativo");
    expect(userAccessKind("SERVICE_CENTER")).toBe("operativo");
  });
});

describe("userPortalAccessLabel", () => {
  it("distinguishes SENIAT and SERVICE_CENTER from panel roles", () => {
    expect(userPortalAccessLabel("TECHNICIAN")).toBe("Panel + libro fiscal");
    expect(userPortalAccessLabel("DISTRIBUTOR")).toBe("Panel + libro fiscal");
    expect(userPortalAccessLabel("SENIAT")).toBe("Solo libro fiscal");
    expect(userPortalAccessLabel("SERVICE_CENTER")).toBe(
      "Solo libro fiscal (operaciones de campo)",
    );
  });
});

describe("userCreateSuccessMessage", () => {
  it("mentions the correct portal on create", () => {
    expect(userCreateSuccessMessage("Ana", "SENIAT")).toMatch(/libro fiscal/i);
    expect(userCreateSuccessMessage("Ana", "ADMIN")).toMatch(/panel/i);
    expect(userCreateSuccessMessage("Ana", "SERVICE_CENTER")).toMatch(/libro fiscal/i);
  });
});

describe("access helpers", () => {
  it("flags panel access and write scope", () => {
    expect(canAccessPanel("SENIAT")).toBe(false);
    expect(canAccessPanel("SERVICE_CENTER")).toBe(false);
    expect(canAccessPanel("TECHNICIAN")).toBe(true);
    expect(canAccessPanel("DISTRIBUTOR")).toBe(true);
    expect(roleHasGlobalScope("TECHNICIAN")).toBe(false);
    expect(userFiscalBookWriteLabel("SENIAT")).toBe("Solo lectura");
    expect(userFiscalBookWriteLabel("ADMIN")).toBe("Escritura global");
    expect(userFiscalBookWriteLabel("SERVICE_CENTER")).toBe(
      "Servicios técnicos e inspecciones",
    );
    expect(userFiscalBookWriteLabel("DISTRIBUTOR")).toBe(
      "Inspecciones anuales en alcance",
    );
  });
});
