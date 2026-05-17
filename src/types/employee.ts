export const EMPLOYEE_TYPES = [
  "administrativo",
  "tecnico",
  "vendedor",
  "gerente",
] as const;

export type EmployeeType = (typeof EMPLOYEE_TYPES)[number];

export type EmployeeResponse = {
  id: number;
  nationalId: string;
  name: string;
  phone: string;
  email: string;
  createdAt: string;
  type: EmployeeType;
  branchId: number;
};

export type EmployeeRequest = {
  nationalId: string;
  name: string;
  phone: string;
  email: string;
  type: EmployeeType;
  branchId: number;
};
