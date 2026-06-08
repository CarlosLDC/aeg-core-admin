import { describe, expect, it } from "vitest";
import { getActiveSealSerial } from "@/lib/fiscal-book/fiscal-helpers";
import {
  buildFiscalPrinter,
  mapAnnualInspectionToReview,
  mapSealToPrecinto,
  mapTechnicalServiceToReview,
  type FiscalBookCatalog,
} from "@/lib/fiscal-book/map-fiscal-printer";
import type { AnnualInspectionResponse } from "@/types/annual-inspection";
import type { PrinterResponse } from "@/types/printer";
import type { SealResponse } from "@/types/seal";
import type { TechnicalServiceResponse } from "@/types/technical-service";

const baseCatalog: FiscalBookCatalog = {
  companies: [
    {
      id: 1,
      businessName: "Empresa Demo C.A.",
      rif: "J123456789",
      contributorType: "ordinario",
      createdAt: "2024-01-01T00:00:00Z",
    },
  ],
  branches: [
    {
      id: 10,
      companyId: 1,
      city: "Caracas",
      state: "Distrito Capital",
      address: "Av. Principal",
      phone: "",
      email: "",
      createdAt: "2024-01-01T00:00:00Z",
    },
  ],
  clients: [
    {
      id: 100,
      branchId: 10,
      createdAt: "2024-01-01T00:00:00Z",
      reviewStatus: "ACTIVE",
    },
  ],
  distributors: [],
  serviceCenters: [
    { id: 5, branchId: 10, createdAt: "2024-01-01T00:00:00Z" },
  ],
  employees: [
    {
      id: 200,
      nationalId: "V12345678",
      name: "Juan Técnico",
      phone: "",
      email: "",
      createdAt: "2024-01-01T00:00:00Z",
      type: "tecnico",
      companyId: 1,
      reviewStatus: "ACTIVE",
      activeModificationRequestId: null,
    },
    {
      id: 201,
      nationalId: "V87654321",
      name: "Ana Inspector",
      phone: "",
      email: "",
      createdAt: "2024-01-01T00:00:00Z",
      type: "tecnico",
      companyId: 1,
      reviewStatus: "ACTIVE",
      activeModificationRequestId: null,
    },
  ],
  technicians: [{ id: 50, employeeId: 200, createdAt: "2024-01-01T00:00:00Z" }],
  models: [
    {
      id: 1,
      brand: "Bixolon",
      modelCode: "SRP-350",
      providencia: "0141",
      approvalDate: "2020-01-01",
      price: 100,
      createdAt: "2024-01-01T00:00:00Z",
    },
  ],
  software: [],
};

const printer: PrinterResponse = {
  id: 1,
  modelId: 1,
  softwareId: null,
  clientId: 100,
  fiscalSerial: "GRA0000123",
  finalSalePrice: 500,
  createdAt: "2024-01-01T00:00:00Z",
  status: "enajenada",
  distributorId: null,
  paid: true,
  installationDate: "2024-02-01",
  versionFirmware: "1.0.0",
  macAddress: null,
  deviceType: "interno",
};

describe("mapSealToPrecinto", () => {
  it("maps seal fields to precinto view model", () => {
    const seal: SealResponse = {
      id: 9,
      printerId: 1,
      serial: "PRC0000001",
      color: "azul",
      status: "en_impresora",
      createdAt: "2024-03-01T10:00:00Z",
      installationDate: "2024-03-01T10:00:00Z",
      removalDate: null,
    };
    expect(mapSealToPrecinto(seal)).toEqual({
      id: "9",
      printerId: 1,
      serial: "PRC0000001",
      color: "azul",
      status: "en_impresora",
      createdAt: "2024-03-01T10:00:00Z",
      installationDate: "2024-03-01T10:00:00Z",
      removalDate: null,
    });
  });
});

describe("mapTechnicalServiceToReview", () => {
  const seals: SealResponse[] = [
    {
      id: 1,
      printerId: 1,
      serial: "OLD0000001",
      color: "azul",
      status: "sustituido",
      createdAt: "2024-01-01T00:00:00Z",
      installationDate: "2024-01-01T08:00:00Z",
      removalDate: "2024-06-01T12:00:00Z",
    },
    {
      id: 2,
      printerId: 1,
      serial: "NEW0000001",
      color: "verde",
      status: "en_impresora",
      createdAt: "2024-06-01T12:00:00Z",
      installationDate: "2024-06-01T12:00:00Z",
      removalDate: null,
    },
  ];

  const service: TechnicalServiceResponse = {
    id: 77,
    printerId: 1,
    technicianId: 50,
    serviceCenterId: 5,
    distributorId: null,
    sealTampered: true,
    notes: "Observación",
    startAt: "2024-06-01T12:00:00Z",
    endAt: "2024-06-01T14:00:00Z",
    createdAt: "2024-06-01T15:00:00Z",
    photoUrls: [],
    installedSealId: 2,
    removedSealId: 1,
    initialZReport: 100,
    finalZReport: 105,
    cost: 50,
    reportedFailure: "Falla de corte",
    requestDate: "2024-06-01",
    initialZDate: "2024-06-01",
    finalZDate: "2024-06-01",
  };

  it("maps technician, seals and Z reports", () => {
    const review = mapTechnicalServiceToReview(service, seals, baseCatalog);
    expect(review.id).toBe("77");
    expect(review.technician).toBe("Juan Técnico");
    expect(review.technicianId).toBe("V12345678");
    expect(review.currentSealSerial).toBe("OLD0000001");
    expect(review.newSealSerial).toBe("NEW0000001");
    expect(review.sealReplaced).toBe(true);
    expect(review.zReportStart).toBe("100");
    expect(review.zReportEnd).toBe("105");
    expect(review.description).toBe("Falla de corte");
  });

  it("falls back to temporal seal match when removedSealId is missing", () => {
    const review = mapTechnicalServiceToReview(
      { ...service, removedSealId: null },
      seals,
      baseCatalog,
    );
    expect(review.currentSealSerial).toBe("OLD0000001");
  });
});

describe("mapAnnualInspectionToReview", () => {
  it("maps inspector and marks past inspections as passed", () => {
    const inspection: AnnualInspectionResponse = {
      id: 3,
      printerId: 1,
      employeeId: 201,
      sealTampered: false,
      notes: "Todo correcto",
      createdAt: "2023-01-01T00:00:00Z",
      photoUrls: [],
      inspectionDate: "2023-06-15",
    };
    const review = mapAnnualInspectionToReview(inspection, baseCatalog);
    expect(review.inspector).toBe("Ana Inspector");
    expect(review.status).toBe("passed");
    expect(review.observations).toBe("Todo correcto");
  });
});

describe("buildFiscalPrinter", () => {
  it("exposes active seal serial from mapped seals", () => {
    const seals: SealResponse[] = [
      {
        id: 1,
        printerId: 1,
        serial: "ACT0000001",
        color: "azul",
        status: "en_impresora",
        createdAt: "2024-01-01T00:00:00Z",
        installationDate: "2024-01-01T00:00:00Z",
        removalDate: null,
      },
    ];
    const fiscal = buildFiscalPrinter(printer, seals, [], [], baseCatalog);
    expect(getActiveSealSerial(fiscal)).toBe("ACT0000001");
    expect(fiscal.businessName).toBe("Empresa Demo C.A.");
    expect(fiscal.rif).toBe("J123456789");
  });
});
