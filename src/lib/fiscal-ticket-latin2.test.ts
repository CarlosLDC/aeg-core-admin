import { describe, expect, it } from "vitest";
import {
  decodeLatin2,
  encodeLatin2,
  FISCAL_TICKET_CHARSET,
  normalizeFiscalTicketText,
} from "./fiscal-ticket-latin2";
import {
  buildDispositionInvoiceData,
  encodeFiscalInvoiceLatin2,
  FISCAL_TICKET_CHARSET as INVOICE_CHARSET,
} from "./venezuelan-fiscal-invoice";
import { mockClient } from "@/lib/test-fixtures";
import type { BranchResponse } from "@/types/branch";
import type { DistributorResponse } from "@/types/branch-role";
import type { CompanyResponse } from "@/types/company";
import type { PrinterResponse } from "@/types/printer";

describe("fiscal ticket latin-2", () => {
  it("exposes iso-8859-2 charset constant", () => {
    expect(FISCAL_TICKET_CHARSET).toBe("iso-8859-2");
  });

  it("normalizes unsupported punctuation to latin-2 safe characters", () => {
    expect(normalizeFiscalTicketText("Caracas — Miranda")).toBe(
      "Caracas - Miranda",
    );
  });

  it("preserves spanish enye in header and trailer text", () => {
    expect(normalizeFiscalTicketText("Niño pequeño")).toBe("Niño pequeño");
    expect(normalizeFiscalTicketText("AÑO NUEVO")).toBe("AÑO NUEVO");
  });

  it("encodes spanish enye as latin-1 byte positions", () => {
    expect([...encodeLatin2("ñ")]).toEqual([0xf1]);
    expect([...encodeLatin2("Ñ")]).toEqual([0xd1]);
    expect([...encodeLatin2("íñ")]).toEqual([0xed, 0xf1]);
  });

  it("decodes spanish enye bytes for ticket display", () => {
    expect(decodeLatin2(new Uint8Array([0xf1]))).toBe("ñ");
    expect(decodeLatin2(new Uint8Array([0xd1]))).toBe("Ñ");
  });

  it("encodes spanish i acute as single latin-2 byte", () => {
    const bytes = encodeLatin2("í");
    expect(bytes).toEqual(new Uint8Array([0xed]));
  });

  it("encodes and decodes spanish accents in latin-2", () => {
    const text = "ENAJENACION EN CARACAS";
    const bytes = encodeLatin2(text);
    expect(decodeLatin2(bytes)).toBe(text);
    expect(bytes.every((byte) => byte <= 0xff)).toBe(true);
  });

  it("builds invoice data tagged with latin-2 encoding", () => {
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
      distributorId: null,
      fiscalSerial: "GRA0000017",
      finalSalePrice: 100,
    } as PrinterResponse;

    const data = buildDispositionInvoiceData({
      clientId: 1,
      clients: [mockClient({ id: 1, branchId: 1 })],
      branches: [branch],
      companies: [company],
      printer,
    });

    expect(data?.encoding).toBe(INVOICE_CHARSET);
    expect(encodeFiscalInvoiceLatin2(data!).length).toBeGreaterThan(0);
  });
});
