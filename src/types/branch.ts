import type {
  ClientResponse,
  DistributorResponse,
  ServiceCenterResponse,
} from "@/types/branch-role";
import type { BranchOrganizationRole } from "@/types/organization";

export type BranchResponse = {
  id: number;
  companyId: number;
  city: string;
  state: string;
  address: string;
  phone: string;
  email: string;
  contactPersonName?: string;
  isClient?: boolean;
  isDistributor?: boolean;
  isServiceCenter?: boolean;
  organizationRole?: BranchOrganizationRole;
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
  isClient?: boolean;
  isDistributor?: boolean;
  isServiceCenter?: boolean;
  organizationRole?: BranchOrganizationRole;
};

export type BranchWithRoles = BranchResponse & {
  distributor?: DistributorResponse;
  client?: ClientResponse;
  serviceCenter?: ServiceCenterResponse;
};
