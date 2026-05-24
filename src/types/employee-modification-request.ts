import type {
  EmployeeRequest,
  EmployeeReviewStatus,
  EmployeeType,
} from "@/types/employee";

export type ModificationActionType = "UPDATE" | "DELETE";
export type ModificationRequestStatus = "PENDING" | "APPROVED" | "REJECTED";

export type EmployeeSnapshotResponse = {
  id: number;
  nationalId: string;
  name: string;
  phone: string;
  email: string;
  type: EmployeeType;
  branchId: number;
  reviewStatus: EmployeeReviewStatus;
  isTechnician: boolean;
  isDistributorPerson: boolean;
};

export type EmployeeModificationProposedData = EmployeeRequest & {
  isTechnician?: boolean;
  isDistributorPerson?: boolean;
};

export type ModificationRequestListItemResponse = {
  id: number;
  employeeId: number;
  employeeName: string;
  actionType: ModificationActionType;
  status: ModificationRequestStatus;
  requestedById: number;
  requestedByName: string;
  createdAt: string;
};

export type ModificationRequestDetailResponse = {
  id: number;
  employeeId: number;
  actionType: ModificationActionType;
  status: ModificationRequestStatus;
  proposedData: Partial<EmployeeModificationProposedData> | null;
  currentEmployeeSnapshot: EmployeeSnapshotResponse | null;
  requestedById: number;
  requestedByName: string;
  createdAt: string;
};
