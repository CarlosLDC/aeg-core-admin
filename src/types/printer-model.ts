export type PrinterModelResponse = {
  id: number;
  modelCode: string;
  serialPrefix?: string | null;
  price: number;
  providencia: string;
  approvalDate: string;
  createdAt: string;
};

export type PrinterModelRequest = {
  modelCode: string;
  serialPrefix: string;
  price: number;
  providencia?: string;
  approvalDate?: string;
};
