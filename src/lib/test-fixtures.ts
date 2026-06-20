import type { ClientResponse } from "@/types/branch-role";

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
