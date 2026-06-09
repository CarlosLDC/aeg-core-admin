import { describe, expect, it } from "vitest";
import { mockClient } from "@/lib/test-fixtures";
import type { BranchResponse } from "@/types/branch";
import type { DistributorResponse } from "@/types/branch-role";
import type { CompanyResponse } from "@/types/company";
import type { PrinterResponse } from "@/types/printer";
import {
  buildDispositionInvoiceData,
  buildSimulatedInvoiceNumber,
  fiscalTicketSeparator,
  formatFiscalInvoiceDate,
  formatFiscalInvoiceTime,
  formatRifForFiscalDisplay,
  splitAddressLines,
  syncInvoiceAmounts,
} from "./venezuelan-fiscal-invoice";

const branch: BranchResponse = {
  id: 1,
  companyId: 10,
  city: "Caracas",
  state: "Distrito Capital",
  address: "Av. Principal 123, Centro",
  phone: "",
  email: "",
  createdAt: "",
};

const distributorBranch: BranchResponse = {
  id: 20,
  companyId: 30,
  city: "Los Teques",
  state: "Miranda",
  address:
    "AV. BICENTENARIO REDOMA EL TAMBOR EDIF. VERACRUZ, PISO 1 LOCAL NRO 3 LOS TEQUES, EDO. MIRANDA",
  phone: "",
  email: "",
  createdAt: "",
};

const company: CompanyResponse = {
  id: 10,
  businessName: "Cliente Demo C.A.",
  rif: "J315694205",
  contributorType: "ordinario",
  createdAt: "",
};

const distributorCompany: CompanyResponse = {
  id: 30,
  businessName: "ALPHA ENGINEER GROUP",
  rif: "J504594369",
  contributorType: "ordinario",
  createdAt: "",
};

const distributors: DistributorResponse[] = [
  { id: 7, branchId: 20, createdAt: "" },
];

const printer = {
  id: 5,
  distributorId: 7,
  fiscalSerial: "GRA0000017",
  finalSalePrice: 732.35,
} as PrinterResponse;

describe("venezuelan fiscal invoice", () => {
  it("formats rif with hyphen after initial letter", () => {
    expect(formatRifForFiscalDisplay("j315694205")).toBe("J-315694205");
    expect(formatRifForFiscalDisplay("V-12345678")).toBe("V-12345678");
  });

  it("splits long addresses into two lines", () => {
    const [line1, line2] = splitAddressLines(distributorBranch.address);
    expect(line1).toContain("AV. BICENTENARIO");
    expect(line2).toContain("MIRANDA");
  });

  it("builds structured invoice data for disposition", () => {
    const issuedAt = new Date("2026-05-28T12:18:00");
    const data = buildDispositionInvoiceData({
      clientId: 1,
      clients: [
        mockClient({
          id: 1,
          branchId: 1,
          companyRif: "V00000003",
          companyBusinessName: "Contado",
        }),
      ],
      branches: [branch, distributorBranch],
      companies: [company, distributorCompany],
      distributors,
      printer,
      issuedAt,
    });

    expect(data).not.toBeNull();
    expect(data?.encoding).toBe("iso-8859-2");
    expect(data?.encabezado.lineas[0]).toBe("SENIAT");
    expect(data?.encabezado.lineas[1]).toBe("V-00000003");
    expect(data?.encabezado.lineas[2]).toBe("Contado");
    expect(data?.encabezado.lineas[3]).toBe("Av. Principal 123");
    expect(data?.encabezado.lineas[4]).toBe("Centro");
    expect(data?.encabezado.lineas[5]).toBe("Caracas, Distrito Capital");
    expect(data?.metadatos.fecha).toBe("28/05/2026");
    expect(data?.metadatos.hora).toBe("12:18");
    expect(data?.cliente.rifCi).toBe("V-00000003");
    expect(data?.cliente.razonSocial).toBe("Contado");
    expect(data?.cliente.condicion).toBe("contado");
    expect(data?.items[0]?.descripcion).toBe("ENAJENACION DE EQUIPO FISCAL");
    expect(data?.impuestos.baseImponibleG).toBe(732.35);
    expect(data?.impuestos.ivaG).toBe(117.18);
    expect(data?.pagos.totalGeneral).toBe(849.53);
    expect(data?.piePagina.serialFiscal).toBe("GRA0000017");
    expect(data?.piePagina.codigoImpresora).toBe("GR");
  });

  it("falls back to company and branch location when client fields are missing", () => {
    const data = buildDispositionInvoiceData({
      clientId: 2,
      clients: [mockClient({ id: 2, branchId: 2 })],
      branches: [{ ...branch, id: 2, address: "" }],
      companies: [company],
      printer: { ...printer, distributorId: null },
    });

    expect(data?.cliente.rifCi).toBe("J-315694205");
    expect(data?.cliente.razonSocial).toBe("Cliente Demo C.A.");
    expect(data?.encabezado.lineas[1]).toBe("J-315694205");
    expect(data?.encabezado.lineas[2]).toBe("Cliente Demo C.A.");
    expect(data?.encabezado.lineas[5]).toBe("Caracas, Distrito Capital");
  });

  it("returns null for unknown client", () => {
    expect(
      buildDispositionInvoiceData({
        clientId: 99,
        clients: [],
        branches: [],
        companies: [],
        printer,
      }),
    ).toBeNull();
  });

  it("builds simulated invoice number as 8 digits", () => {
    expect(buildSimulatedInvoiceNumber(new Date("2026-05-30T18:30:45"), 8)).toBe(
      "00081830",
    );
  });

  it("formats fiscal date and time", () => {
    const issuedAt = new Date("2026-05-28T12:18:00");
    expect(formatFiscalInvoiceDate(issuedAt)).toBe("28/05/2026");
    expect(formatFiscalInvoiceTime(issuedAt)).toBe("12:18");
  });

  it("renders ticket separator with 68 characters", () => {
    expect(fiscalTicketSeparator()).toHaveLength(68);
  });

  it("recalculates taxes when item price changes", () => {
    const issuedAt = new Date("2026-05-28T12:18:00");
    const base = buildDispositionInvoiceData({
      clientId: 1,
      clients: [
        mockClient({
          id: 1,
          branchId: 1,
          companyRif: "V00000003",
          companyBusinessName: "Contado",
        }),
      ],
      branches: [branch, distributorBranch],
      companies: [company, distributorCompany],
      distributors,
      printer: { ...printer, finalSalePrice: 100 },
      issuedAt,
    });
    expect(base).not.toBeNull();
    const updated = syncInvoiceAmounts({
      ...base!,
      items: [{ ...base!.items[0]!, precio: 200 }],
    });
    expect(updated.impuestos.baseImponibleG).toBe(200);
    expect(updated.impuestos.ivaG).toBe(32);
    expect(updated.pagos.totalGeneral).toBe(232);
  });
});
