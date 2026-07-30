import { apiFetch } from "@/lib/api";
import type { Role } from "@/types/user";

export type AuthMeResponse = {
  id: number;
  name: string;
  email: string;
  username: string;
  role: Role;
  branchId: number | null;
  distributorId: number | null;
  enabled: boolean;
  canWriteAnnualInspection?: boolean;
};

export async function fetchAuthMe(): Promise<AuthMeResponse> {
  return apiFetch<AuthMeResponse>("/api/auth/me");
}
