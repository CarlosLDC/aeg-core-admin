export type FirmwareResponse = {
  id: number;
  version: string;
  fileName: string;
  sizeBytes: number;
  checksumSha256: string;
  printerModelId: number | null;
  notes: string | null;
  downloadUrl: string;
  createdAt: string;
};

export type FirmwareUploadJobStatus = "PENDING" | "SUCCEEDED" | "FAILED";

export type FirmwareUploadJobResponse = {
  jobId: string;
  status: FirmwareUploadJobStatus;
  error: string | null;
  result: FirmwareResponse | null;
};

export type CreateFirmwareInput = {
  file: File;
  version: string;
  printerModelId?: number | null;
  notes?: string | null;
};

export type UpdateFirmwareInput = {
  version: string;
  printerModelId?: number | null;
  notes?: string | null;
};
