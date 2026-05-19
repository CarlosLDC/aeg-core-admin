export type DistributorResponse = {
  id: number;
  branchId: number;
  createdAt: string;
};

export type DistributorRequest = {
  branchId: number;
};

export type ClientResponse = {
  id: number;
  branchId: number;
  distributorId?: number;
  createdAt: string;
  branchCity?: string | null;
  branchState?: string | null;
  companyBusinessName?: string | null;
  companyRif?: string | null;
  branchPhone?: string | null;
  branchEmail?: string | null;
};

export type ClientRequest = {
  branchId: number;
  distributorId?: number;
};

export type ServiceCenterResponse = {
  id: number;
  branchId: number;
  createdAt: string;
};

export type ServiceCenterRequest = {
  branchId: number;
};
