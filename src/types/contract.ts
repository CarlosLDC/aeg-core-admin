export type DistributorContractResponse = {
  id: number;
  distributorId: number;
  startDate: string;
  endDate: string;
  createdAt: string;
  photoUrls: string[];
};

export type DistributorContractRequest = {
  distributorId: number;
  startDate: string;
  endDate: string;
  photoUrls: string[];
};

export type ServiceCenterContractResponse = {
  id: number;
  serviceCenterId: number;
  startDate: string;
  endDate: string;
  createdAt: string;
  photoUrls: string[];
};

export type ServiceCenterContractRequest = {
  serviceCenterId: number;
  startDate: string;
  endDate: string;
  photoUrls: string[];
};

export type ContractKind = "distributor" | "serviceCenter";
