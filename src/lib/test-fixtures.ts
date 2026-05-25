import type { ClientResponse } from "@/types/branch-role";
import type { EmployeeResponse } from "@/types/employee";

export function mockClient(over: Partial<ClientResponse> = {}): ClientResponse {
  return {
    id: 1,
    branchId: 1,
    createdAt: "",
    reviewStatus: "ACTIVE",
    activeModificationRequestId: null,
    ...over,
  };
}

export function mockEmployee(over: Partial<EmployeeResponse> = {}): EmployeeResponse {
  return {
    id: 1,
    branchId: 1,
    nationalId: "V12345678",
    name: "Empleado",
    phone: "",
    email: "",
    createdAt: "",
    type: "administrativo",
    reviewStatus: "ACTIVE",
    activeModificationRequestId: null,
    ...over,
  };
}
