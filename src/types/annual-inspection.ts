export type AnnualInspectionResponse = {
  id: number;
  printerId: number;
  employeeId: number;
  sealTampered: boolean;
  notes: string | null;
  createdAt: string;
  photoUrls: string[];
  inspectionDate: string;
};

export type AnnualInspectionRequest = {
  printerId: number;
  employeeId: number;
  sealTampered: boolean;
  notes?: string | null;
  photoUrls: string[];
  inspectionDate?: string | null;
};
