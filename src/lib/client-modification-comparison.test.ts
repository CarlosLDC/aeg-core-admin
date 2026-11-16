import { describe, expect, it } from "vitest";
import {
  buildClientComparisonRows,
  computeInlineTextDiff,
  formatComparisonValue,
} from "@/lib/client-modification-comparison";
import type { ClientModificationRequestDetailResponse } from "@/types/client-modification-request";

function makeDetail(
  overrides: Partial<ClientModificationRequestDetailResponse> = {},
): ClientModificationRequestDetailResponse {
  return {
    id: 42,
    clientId: 7,
    actionType: "UPDATE",
    status: "PENDING",
    requestedById: 3,
    requestedByName: "Carlos",
    createdAt: "2026-11-16T10:00:00Z",
    currentClientSnapshot: {
      id: 7,
      branchId: 1,
      distributorId: 1,
      reviewStatus: "PENDING_REVIEW",
      companyId: 2,
      businessName: "SUPERMERCAO HANG HE,C.A.",
      rif: "J-500039441",
      contributorType: "ordinario",
      state: "Delta Amacuro",
      city: "TUCUPITA",
      address: "CALLE MARINO LOCAL NRO. S/N SECTOR CENTRO DE TUCUPITA,EDO.DELTA AMACURO",
      contactPersonName: "ANDY",
      phone: "412 182 0900",
      email: "herw5254@gmail.com",
    },
    proposedData: {
      businessName: "SUPERMERCADO HANG HE,C.A.",
      rif: "J-500039441",
      contributorType: "ordinario",
      state: "Delta Amacuro",
      city: "TUCUPITA",
      address: "CALLE MARINO LOCAL NRO. S/N SECTOR CENTRO DE TUCUPITA,EDO.DELTA AMACURO",
      contactPersonName: "ANDY",
      phone: "412 182 0900",
      email: "herw5254@gmail.com",
    },
    ...overrides,
  };
}

describe("formatComparisonValue", () => {
  it("normalizes nullish and blank strings to em dash", () => {
    expect(formatComparisonValue(null)).toBe("—");
    expect(formatComparisonValue(undefined)).toBe("—");
    expect(formatComparisonValue("")).toBe("—");
    expect(formatComparisonValue("   ")).toBe("—");
  });

  it("trims non-empty values", () => {
    expect(formatComparisonValue("  TUCUPITA  ")).toBe("TUCUPITA");
    expect(formatComparisonValue(123)).toBe("123");
  });
});

describe("buildClientComparisonRows", () => {
  it("marks only modified fields as changed and extracts contributor types", () => {
    const rows = buildClientComparisonRows(makeDetail());
    const changed = rows.filter((r) => r.changed);
    const unchanged = rows.filter((r) => !r.changed);

    expect(changed).toHaveLength(1);
    expect(changed[0]?.key).toBe("businessName");
    expect(changed[0]?.before).toBe("SUPERMERCAO HANG HE,C.A.");
    expect(changed[0]?.after).toBe("SUPERMERCADO HANG HE,C.A.");

    expect(unchanged).toHaveLength(8);
    const contributor = rows.find((r) => r.key === "contributorType");
    expect(contributor?.beforeContributor).toBe("ordinario");
    expect(contributor?.afterContributor).toBe("ordinario");
  });

  it("treats empty string and null as equivalent unchanged values", () => {
    const detail = makeDetail({
      currentClientSnapshot: {
        ...makeDetail().currentClientSnapshot!,
        businessName: "SUPERMERCADO HANG HE,C.A.",
        address: "   ",
      },
      proposedData: {
        ...makeDetail().proposedData!,
        businessName: "SUPERMERCADO HANG HE,C.A.",
        address: null,
      },
    });
    const rows = buildClientComparisonRows(detail);
    expect(rows.every((r) => !r.changed)).toBe(true);
    expect(rows.find((r) => r.key === "address")?.before).toBe("—");
  });

  it("handles DELETE actionType cleanly", () => {
    const detail = makeDetail({ actionType: "DELETE", proposedData: null });
    const rows = buildClientComparisonRows(detail);
    expect(rows.every((r) => r.changed)).toBe(true);
    expect(rows[0]?.after).toBe("Eliminar");
    expect(
      rows.find((r) => r.key === "contributorType")?.afterContributor,
    ).toBeNull();
  });
});

describe("computeInlineTextDiff", () => {
  it("highlights single-character insertion typo fixes with shared prefix and suffix", () => {
    const diff = computeInlineTextDiff(
      "SUPERMERCAO HANG HE,C.A.",
      "SUPERMERCADO HANG HE,C.A.",
    );
    expect(diff).toEqual({
      partial: true,
      prefix: "SUPERMERCA",
      beforeChanged: "",
      afterChanged: "D",
      suffix: "O HANG HE,C.A.",
    });
  });

  it("highlights character substitutions in the middle of a string", () => {
    const diff = computeInlineTextDiff(
      "SUPERMERKADO HANG HE,C.A.",
      "SUPERMERCADO HANG HE,C.A.",
    );
    expect(diff).toEqual({
      partial: true,
      prefix: "SUPERMER",
      beforeChanged: "K",
      afterChanged: "C",
      suffix: "ADO HANG HE,C.A.",
    });
  });

  it("handles pure suffix additions", () => {
    const diff = computeInlineTextDiff("SUPERMERCADO", "SUPERMERCADO C.A.");
    expect(diff).toEqual({
      partial: true,
      prefix: "SUPERMERCADO",
      beforeChanged: "",
      afterChanged: " C.A.",
      suffix: "",
    });
  });

  it("falls back to full replacement when strings are mostly different or placeholders", () => {
    expect(computeInlineTextDiff("TUCUPITA", "MATURÍN")).toEqual({
      partial: false,
      before: "TUCUPITA",
      after: "MATURÍN",
    });
    expect(computeInlineTextDiff("—", "ANDY")).toEqual({
      partial: false,
      before: "—",
      after: "ANDY",
    });
    expect(computeInlineTextDiff("CARLOS", "MARCOS")).toEqual({
      partial: false,
      before: "CARLOS",
      after: "MARCOS",
    });
  });
});
