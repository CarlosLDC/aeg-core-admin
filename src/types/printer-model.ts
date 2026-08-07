export type PrinterModelResponse = {
  id: number;
  modelCode: string;
  price: number;
  providencia: string;
  approvalDate: string;
  createdAt: string;
};

export type PrinterModelRequest = {
  modelCode: string;
  price: number;
  providencia?: string;
  approvalDate?: string;
};
