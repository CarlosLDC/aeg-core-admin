export type LoginRequest = {
  username: string;
  password: string;
  portal?: "CORE_ADMIN" | "FISCAL_BOOK";
};

export type AuthResponse = {
  token: string;
};

export type JwtPayload = {
  sub?: string;
  exp?: number;
  iat?: number;
  role?: string;
  branchId?: number;
  distributorId?: number;
  authorities?: string[];
  roles?: string[];
};

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
