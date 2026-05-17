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
