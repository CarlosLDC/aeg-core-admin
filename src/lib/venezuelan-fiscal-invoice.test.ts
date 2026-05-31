import { describe, expect, it } from "vitest";
import { mockClient } from "@/lib/test-fixtures";
import type { BranchResponse } from "@/types/branch";
import type { CompanyResponse } from "@/types/company";
import type { PrinterResponse } from "@/types/printer";
import {
  buildDispositionInvoiceData,
  buildSimulatedInvoiceNumber,
  formatRifForFiscalDisplay,
} from "./venezuelan-fiscal-invoice";

const branch: BranchResponse = {
  id: 1,
  companyId: 10,
  city: "Caracas",
  state: "Distrito Capital",
  address: "Av. Principal 123",
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

const printer = {
  id: 5,
  fiscalSerial: "ABC123456789",
} as PrinterResponse;

describe("venezuelan fiscal invoice", () => {
  it("formats rif with hyphen after initial letter", () => {
    expect(formatRifForFiscalDisplay("j315694205")).toBe("J-315694205");
    expect(formatRifForFiscalDisplay("V-12345678")).toBe("V-12345678");
  });

  it("builds invoice header from client embedded fields", () => {
    const data = buildDispositionInvoiceData({
      clientId: 1,
      clients: [
        mockClient({
          id: 1,
          branchId: 1,
          companyRif: "J315694205",
          companyBusinessName: "Acme C.A.",
        }),
      ],
      branches: [branch],
      companies: [company],
      printer,
      issuedAt: new Date("2026-05-30T18:30:00"),
    });

    expect(data).not.toBeNull();
    expect(data?.seniatLabel).toBe("SENIAT");
    expect(data?.rif).toBe("J-315694205");
    expect(data?.businessName).toBe("Acme C.A.");
    expect(data?.address).toBe("Av. Principal 123");
    expect(data?.fiscalSerial).toBe("ABC123456789");
    expect(data?.totalFormatted).toBe("0,00");
  });

  it("falls back to company and branch location when client fields are missing", () => {
    const data = buildDispositionInvoiceData({
      clientId: 2,
      clients: [mockClient({ id: 2, branchId: 2 })],
      branches: [{ ...branch, id: 2, address: "" }],
      companies: [company],
      printer,
    });

    expect(data?.rif).toBe("J-315694205");
    expect(data?.businessName).toBe("Cliente Demo C.A.");
    expect(data?.address).toBe("Caracas, Distrito Capital");
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

  it("builds simulated invoice number from timestamp", () => {
    expect(
      buildSimulatedInvoiceNumber(new Date("2026-05-30T18:30:45")),
    ).toBe("F20260530-183045");
  });
});
