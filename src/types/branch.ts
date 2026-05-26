import type {
  ClientResponse,
  DistributorResponse,
  ServiceCenterResponse,
} from "@/types/branch-role";

export type BranchResponse = {
  id: number;
  companyId: number;
  city: string;
  state: string;
  address: string;
  phone: string;
  email: string;
  contactPersonName?: string;
  createdAt: string;
};

export type BranchRequest = {
  companyId: number;
  city: string;
  state: string;
  address?: string;
  phone?: string;
  email?: string;
  contactPersonName?: string;
};

export type BranchWithRoles = BranchResponse & {
  distributor?: DistributorResponse;
  client?: ClientResponse;
  serviceCenter?: ServiceCenterResponse;
};
