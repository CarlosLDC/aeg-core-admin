export type TechnicalServiceResponse = {
  id: number;
  printerId: number;
  userId: number;
  technicianName: string | null;
  technicianNationalId: string | null;
  serviceCenterId: number | null;
  sealTampered: boolean;
  /** Always null from API; text lives in reportedFailure. Kept for wire compatibility. */
  notes: string | null;
  startAt: string;
  createdAt: string;
  endAt: string;
  installedSealId: number | null;
  removedSealId: number | null;
  initialZReport: number;
  finalZReport: number;
  cost: number;
  reportedFailure: string;
  requestDate: string;
  initialZDate: string;
  finalZDate: string;
  distributorId: number | null;
};

export type TechnicalServiceRequest = {
  printerId: number;
  userId: number;
  serviceCenterId?: number | null;
  sealTampered: boolean;
  /** Optional; backend merges into reportedFailure and clears notes. Prefer null. */
  notes?: string | null;
  startAt: string;
  endAt: string;
  installedSealId?: number | null;
  removedSealId?: number | null;
  initialZReport: number;
  finalZReport: number;
  cost: number;
  reportedFailure: string;
  requestDate: string;
  initialZDate: string;
  finalZDate: string;
  distributorId?: number | null;
};
