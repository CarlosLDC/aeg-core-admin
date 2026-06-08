export const FISCAL_BOOK_ROLES = [
  "FISCAL_ADMIN",
  "FISCAL_TECHNICIAN",
  "FISCAL_AUDITOR",
] as const;

export type FiscalBookRole = (typeof FISCAL_BOOK_ROLES)[number];

export type FiscalBookUserResponse = {
  id: number;
  name: string;
  email: string;
  role: FiscalBookRole;
  employeeId: number | null;
  enabled: boolean;
};

export type FiscalBookUserRegistrationRequest = {
  name: string;
  email: string;
  password: string;
  role: FiscalBookRole;
  employeeId?: number | null;
};

export type FiscalBookUserUpdateRequest = {
  name?: string;
  email?: string;
  password?: string;
  role?: FiscalBookRole;
  employeeId?: number | null;
  enabled?: boolean;
};
