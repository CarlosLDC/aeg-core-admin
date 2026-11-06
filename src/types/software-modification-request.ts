import type { ModificationActionType, ModificationRequestStatus } from "@/types/client-modification-request";
import type { SoftwareDistributor } from "@/types/software";

export type SoftwareModificationCreateRequest = {
  printerId: number;
  name: string;
  version: string;
  programmingLanguages?: string[];
  operatingSystems?: string[];
  developerName?: string | null;
  developerRif?: string | null;
  external?: boolean;
  distributorCompanyIds?: number[];
};

export type SoftwareModificationRequestListItemResponse = {
  id: number;
  printerId: number;
  printerFiscalSerial: string;
  softwareName: string;
  softwareVersion: string;
  actionType: ModificationActionType;
  status: ModificationRequestStatus;
  requestedById: number | null;
  requestedByName: string;
  createdAt: string;
};

export type SoftwareModificationRequestDetailResponse = {
  id: number;
  printerId: number;
  printerFiscalSerial: string;
  printerModelCode: string;
  distributorName: string;
  actionType: ModificationActionType;
  status: ModificationRequestStatus;
  name: string;
  version: string;
  programmingLanguages: string[];
  operatingSystems: string[];
  developerName: string | null;
  developerRif: string | null;
  external: boolean;
  distributors: SoftwareDistributor[];
  requestedById: number | null;
  requestedByName: string;
  createdAt: string;
};
