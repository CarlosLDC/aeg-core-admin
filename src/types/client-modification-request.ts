import type { ContributorType } from "@/types/company";

export type ModificationActionType = "UPDATE" | "DELETE";
export type ModificationRequestStatus = "PENDING" | "APPROVED" | "REJECTED";
export type ClientReviewStatus = "ACTIVE" | "PENDING_REVIEW";

export type ClientModificationProposedData = {
  businessName: string;
  rif: string;
  contributorType: ContributorType;
  city: string;
  state: string;
  address?: string | null;
  contactPersonName?: string | null;
  phone?: string | null;
  email?: string | null;
  distributorId?: number | null;
};

export type ClientSnapshotResponse = {
  id: number;
  branchId: number | null;
  distributorId: number | null;
  reviewStatus: ClientReviewStatus;
  companyId: number | null;
  businessName: string | null;
  rif: string | null;
  contributorType: ContributorType | null;
  city: string | null;
  state: string | null;
  address: string | null;
  contactPersonName: string | null;
  phone: string | null;
  email: string | null;
};

export type ClientModificationRequestListItemResponse = {
  id: number;
  clientId: number;
  clientName: string;
  actionType: ModificationActionType;
  status: ModificationRequestStatus;
  requestedById: number;
  requestedByName: string;
  createdAt: string;
};

export type ClientModificationRequestDetailResponse = {
  id: number;
  clientId: number;
  actionType: ModificationActionType;
  status: ModificationRequestStatus;
  proposedData: Partial<ClientModificationProposedData> | null;
  currentClientSnapshot: ClientSnapshotResponse | null;
  requestedById: number;
  requestedByName: string;
  createdAt: string;
};
