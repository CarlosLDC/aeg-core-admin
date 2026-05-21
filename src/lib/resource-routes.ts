/** Rutas de detalle de recursos (vista). */

export function companyPath(id: number): string {
  return `/companies/${id}`;
}

export function branchPath(id: number): string {
  return `/branches/${id}`;
}

export function clientPath(id: number): string {
  return `/clients/${id}`;
}

export function employeePath(id: number): string {
  return `/employees/${id}`;
}

export function userPath(id: number): string {
  return `/users/${id}`;
}

export function printerPath(id: number): string {
  return `/printers/${id}`;
}

export function printerModelPath(id: number): string {
  return `/printer-models/${id}`;
}

export function sealPath(id: number): string {
  return `/seals/${id}`;
}

export function distributorContractPath(id: number): string {
  return `/contracts/distributor/${id}`;
}

export function serviceCenterContractPath(id: number): string {
  return `/contracts/service-center/${id}`;
}

export function technicalServicePath(id: number): string {
  return `/technical-services/${id}`;
}

export function annualInspectionPath(id: number): string {
  return `/annual-inspections/${id}`;
}
