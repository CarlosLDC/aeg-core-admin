export const EMPLOYEE_TYPES = [
  "tecnico",
] as const;

export type EmployeeType = (typeof EMPLOYEE_TYPES)[number];

export type EmployeeReviewStatus = "ACTIVE" | "PENDING_REVIEW";

export type EmployeeResponse = {
  id: number;
  nationalId: string;
  name: string;
  phone: string;
  email: string;
  createdAt: string;
  type: EmployeeType;
  companyId: number;
  /** @deprecated Solo compatibilidad durante migración backend. */
  branchId?: number | null;
  reviewStatus: EmployeeReviewStatus;
  activeModificationRequestId: number | null;
};

export type EmployeeRequest = {
  nationalId: string;
  name: string;
  phone: string;
  email: string;
  type: EmployeeType;
  companyId: number;
};
