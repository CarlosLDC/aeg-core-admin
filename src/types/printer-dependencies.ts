export type PrinterDependencyType =
  | "client"
  | "seal"
  | "technicalService"
  | "annualInspection";

export type PrinterDependencyRef = {
  type: PrinterDependencyType | string;
  id: number;
  label: string;
};

export type PrinterDeleteBlockedErrorBody = {
  message?: string;
  dependencies?: PrinterDependencyRef[];
  consequences?: string[];
  forceAllowed?: boolean;
};

export type PrinterDeleteImpactResponse = {
  printerId: number;
  fiscalSerial: string;
  dependencies: PrinterDependencyRef[];
  consequences: string[];
  requiresForce: boolean;
};
