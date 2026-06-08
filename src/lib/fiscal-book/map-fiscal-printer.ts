import { formatBranchShort } from "@/lib/branches";
import { splitIsoDateTime } from "@/lib/fiscal-book/fiscal-helpers";
import type {
  FiscalAnnualInspection,
  FiscalBookSearchType,
  FiscalDistribuidora,
  FiscalEmpresa,
  FiscalPrinter,
  FiscalPrinterModel,
  FiscalSoftware,
  FiscalSucursal,
  Precinto,
  TechnicalReview,
} from "@/lib/fiscal-book/types";
import { resolveEmployeeCompanyId } from "@/lib/employee-company";
import type { BranchResponse } from "@/types/branch";
import type {
  ClientResponse,
  DistributorResponse,
  ServiceCenterResponse,
} from "@/types/branch-role";
import type { CompanyResponse } from "@/types/company";
import type { EmployeeResponse } from "@/types/employee";
import type { TechnicianResponse } from "@/types/employee-role";
import type { AnnualInspectionResponse } from "@/types/annual-inspection";
import type { PrinterModelResponse } from "@/types/printer-model";
import type { PrinterResponse } from "@/types/printer";
import type { SealResponse } from "@/types/seal";
import type { SoftwareResponse } from "@/types/software";
import type { TechnicalServiceResponse } from "@/types/technical-service";

export type FiscalBookCatalog = {
  companies: CompanyResponse[];
  branches: BranchResponse[];
  clients: ClientResponse[];
  distributors: DistributorResponse[];
  serviceCenters: ServiceCenterResponse[];
  employees: EmployeeResponse[];
  technicians: TechnicianResponse[];
  models: PrinterModelResponse[];
  software: SoftwareResponse[];
};

function toFiscalEmpresa(company: CompanyResponse): FiscalEmpresa {
  return {
    id: company.id,
    businessName: company.businessName,
    rif: company.rif,
    contributorType: company.contributorType,
  };
}

function toFiscalSucursal(
  branch: BranchResponse,
  companies: CompanyResponse[],
): FiscalSucursal {
  const company =
    companies.find((c) => c.id === branch.companyId) ??
    ({
      id: branch.companyId,
      businessName: "",
      rif: "",
      contributorType: "ordinario",
      createdAt: "",
    } satisfies CompanyResponse);
  return {
    id: branch.id,
    companyId: branch.companyId,
    city: branch.city,
    state: branch.state,
    address: branch.address || null,
    phone: branch.phone || null,
    email: branch.email || null,
    company: toFiscalEmpresa(company),
  };
}

function branchLabel(
  branchId: number | null | undefined,
  catalog: FiscalBookCatalog,
): { name: string | null; rif: string | null } {
  if (branchId == null) return { name: null, rif: null };
  const branch = catalog.branches.find((b) => b.id === branchId);
  if (!branch) return { name: null, rif: null };
  const company = catalog.companies.find((c) => c.id === branch.companyId);
  return {
    name: company
      ? formatBranchShort(branch, catalog.companies)
      : branch.city || null,
    rif: company?.rif ?? null,
  };
}

function employeeOrg(
  employeeId: number,
  catalog: FiscalBookCatalog,
): { name: string | null; center: string | null; rif: string | null } {
  const employee = catalog.employees.find((e) => e.id === employeeId);
  if (!employee) {
    return { name: null, center: null, rif: null };
  }
  const companyId = resolveEmployeeCompanyId(employee, catalog.branches);
  const company = companyId
    ? catalog.companies.find((c) => c.id === companyId)
    : undefined;
  const branch = catalog.branches.find(
    (b) =>
      b.companyId === companyId ||
      (employee.branchId != null && b.id === employee.branchId),
  );
  const center = branch
    ? formatBranchShort(branch, catalog.companies)
    : company?.businessName ?? null;
  return {
    name: employee.name,
    center,
    rif: company?.rif ?? null,
  };
}

function technicianOrg(
  technicianId: number,
  catalog: FiscalBookCatalog,
): { name: string | null; center: string | null; rif: string | null } {
  const technician = catalog.technicians.find((t) => t.id === technicianId);
  if (!technician) {
    return { name: null, center: null, rif: null };
  }
  return employeeOrg(technician.employeeId, catalog);
}

function serviceCenterOrg(
  serviceCenterId: number | null,
  distributorId: number | null,
  catalog: FiscalBookCatalog,
): { center: string | null; rif: string | null } {
  if (serviceCenterId != null) {
    const sc = catalog.serviceCenters.find((c) => c.id === serviceCenterId);
    if (sc) {
      const branch = catalog.branches.find((b) => b.id === sc.branchId);
      const company = branch
        ? catalog.companies.find((c) => c.id === branch.companyId)
        : undefined;
      return {
        center: branch
          ? formatBranchShort(branch, catalog.companies)
          : null,
        rif: company?.rif ?? null,
      };
    }
  }
  if (distributorId != null) {
    const dist = catalog.distributors.find((d) => d.id === distributorId);
    if (dist) {
      const info = branchLabel(dist.branchId, catalog);
      return {
        center: info.name
          ? `Distribuidora — ${info.name}`
          : `Distribuidora (id ${distributorId})`,
        rif: info.rif,
      };
    }
  }
  return { center: null, rif: null };
}

export function mapSealToPrecinto(seal: SealResponse): Precinto {
  return {
    id: String(seal.id),
    printerId: seal.printerId,
    serial: seal.serial,
    color: seal.color,
    status: seal.status,
    createdAt: seal.createdAt,
    installationDate: seal.installationDate,
    removalDate: seal.removalDate,
  };
}

function findRemovedSealFallback(
  seals: SealResponse[],
  startAt: string,
): SealResponse | undefined {
  const serviceTime = new Date(startAt).getTime();
  return seals.find((seal) => {
    const installTime = seal.installationDate
      ? new Date(seal.installationDate).getTime()
      : new Date(seal.createdAt).getTime();
    const retireTime = seal.removalDate
      ? new Date(seal.removalDate).getTime()
      : Infinity;
    return (
      installTime <= serviceTime + 60_000 && retireTime >= serviceTime - 60_000
    );
  });
}

export function mapTechnicalServiceToReview(
  service: TechnicalServiceResponse,
  seals: SealResponse[],
  catalog: FiscalBookCatalog,
): TechnicalReview {
  const technician = catalog.technicians.find((t) => t.id === service.technicianId);
  const employee = technician
    ? catalog.employees.find((e) => e.id === technician.employeeId)
    : undefined;
  const tech = technicianOrg(service.technicianId, catalog);
  const centerInfo = serviceCenterOrg(
    service.serviceCenterId,
    service.distributorId,
    catalog,
  );
  let removed = service.removedSealId
    ? seals.find((s) => s.id === service.removedSealId)
    : undefined;
  if (!removed && service.startAt) {
    removed = findRemovedSealFallback(seals, service.startAt);
  }
  const installed = service.installedSealId
    ? seals.find((s) => s.id === service.installedSealId)
    : undefined;
  const start = splitIsoDateTime(service.startAt);
  const end = splitIsoDateTime(service.endAt);

  return {
    id: String(service.id),
    createdAt: service.createdAt,
    fechaSolicitud: service.requestDate?.split("T")[0] ?? service.requestDate,
    serviceCenter: centerInfo.center ?? tech.center,
    centerRif: centerInfo.rif ?? tech.rif,
    technician: tech.name,
    technicianId: employee?.nationalId ?? null,
    startDate: start.date,
    endDate: end.date,
    date: start.date,
    startTime: start.time,
    endTime: end.time,
    zReportStart:
      service.initialZReport != null ? String(service.initialZReport) : null,
    zReportTimestampStart: service.initialZDate || null,
    zReportEnd:
      service.finalZReport != null ? String(service.finalZReport) : null,
    zReportTimestampEnd: service.finalZDate || null,
    sealBroken: service.sealTampered,
    sealReplaced: service.installedSealId != null,
    currentSealSerial: removed?.serial ?? null,
    newSealSerial: installed?.serial ?? null,
    description: service.reportedFailure || "",
    observaciones: service.notes,
    costo: service.cost,
    photoUrls: service.photoUrls ?? [],
  };
}

export function mapAnnualInspectionToReview(
  inspection: AnnualInspectionResponse,
  catalog: FiscalBookCatalog,
): FiscalAnnualInspection {
  const inspector = employeeOrg(inspection.employeeId, catalog);
  const dateRaw = inspection.inspectionDate || inspection.createdAt;
  const dateStr =
    typeof dateRaw === "string" ? dateRaw.split("T")[0] : String(dateRaw);
  const end = dateRaw ? new Date(dateRaw) : null;
  const passed =
    end != null && !isNaN(end.getTime()) ? end <= new Date() : false;

  return {
    id: String(inspection.id),
    createdAt: inspection.createdAt,
    date: dateStr,
    serviceCenter: inspector.center,
    centerRif: inspector.rif,
    inspector: inspector.name,
    observations: inspection.notes,
    status: passed ? "passed" : "pending",
  };
}

export function buildFiscalPrinterSummary(
  printer: PrinterResponse,
  catalog: FiscalBookCatalog,
): FiscalPrinter {
  const client =
    printer.clientId != null
      ? catalog.clients.find((c) => c.id === printer.clientId)
      : undefined;
  const branch = client
    ? catalog.branches.find((b) => b.id === client.branchId)
    : undefined;
  const company = branch
    ? catalog.companies.find((c) => c.id === branch.companyId)
    : undefined;

  const distributor =
    printer.distributorId != null
      ? catalog.distributors.find((d) => d.id === printer.distributorId)
      : undefined;
  const distBranch = distributor
    ? catalog.branches.find((b) => b.id === distributor.branchId)
    : undefined;

  const model = catalog.models.find((m) => m.id === printer.modelId) ?? null;
  const software =
    printer.softwareId != null
      ? catalog.software.find((s) => s.id === printer.softwareId)
      : undefined;

  const fiscalBranch = branch ? toFiscalSucursal(branch, catalog.companies) : null;
  const addressParts = fiscalBranch
    ? [fiscalBranch.address, fiscalBranch.city, fiscalBranch.state].filter(Boolean)
    : [];

  const fiscalModel: FiscalPrinterModel | null = model
    ? {
        id: model.id,
        brand: model.brand,
        modelCode: model.modelCode,
        providencia: model.providencia || null,
        approvalDate: model.approvalDate || null,
        price: model.price,
      }
    : null;

  const fiscalSoftware: FiscalSoftware | null = software
    ? {
        id: software.id,
        name: software.name,
        version: software.version,
        createdAt: software.createdAt,
      }
    : null;

  const fiscalDistributor: FiscalDistribuidora | null = distributor
    ? {
        id: distributor.id,
        branch: distBranch
          ? toFiscalSucursal(distBranch, catalog.companies)
          : null,
      }
    : null;

  return {
    id: String(printer.id),
    modelId: printer.modelId,
    branchId: branch?.id ?? null,
    distributorId: printer.distributorId,
    fiscalSerial: printer.fiscalSerial,
    status: printer.status,
    finalSalePrice: printer.finalSalePrice,
    paid: printer.paid,
    deviceType: printer.deviceType,
    versionFirmware: printer.versionFirmware,
    createdAt: printer.createdAt,
    installationDate: printer.installationDate,
    macAddress: printer.macAddress,
    businessName: company?.businessName ?? null,
    rif: company?.rif ?? null,
    taxpayerType: company?.contributorType?.toUpperCase() ?? null,
    address: addressParts.join(", ") || null,
    model: fiscalModel,
    software: fiscalSoftware,
    branch: fiscalBranch,
    distributor: fiscalDistributor,
    seals: [],
    technicalReviews: [],
    annualInspections: [],
  };
}

export function buildFiscalPrinter(
  printer: PrinterResponse,
  seals: SealResponse[],
  services: TechnicalServiceResponse[],
  inspections: AnnualInspectionResponse[],
  catalog: FiscalBookCatalog,
): FiscalPrinter {
  const summary = buildFiscalPrinterSummary(printer, catalog);
  return {
    ...summary,
    seals: seals.map(mapSealToPrecinto),
    technicalReviews: services
      .map((s) => mapTechnicalServiceToReview(s, seals, catalog))
      .sort((a, b) =>
        (a.createdAt ?? a.date ?? "").localeCompare(
          b.createdAt ?? b.date ?? "",
          "es",
        ),
      ),
    annualInspections: inspections
      .map((i) => mapAnnualInspectionToReview(i, catalog))
      .sort((a, b) =>
        (a.createdAt ?? a.date ?? "").localeCompare(
          b.createdAt ?? b.date ?? "",
          "es",
        ),
      ),
  };
}

export function isValidFiscalSearchQuery(
  query: string,
  type: FiscalBookSearchType,
): boolean {
  const normalized = query.trim().toUpperCase();
  if (!normalized) return false;
  if (type === "serial") {
    return /^[A-Z]{3}[0-9]{7}$/.test(normalized);
  }
  return /^[VEJPG][0-9]{7,9}$/.test(normalized);
}
