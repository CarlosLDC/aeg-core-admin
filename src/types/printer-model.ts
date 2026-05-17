export type PrinterModelResponse = {
  id: number;
  brand: string;
  modelCode: string;
  providencia: string;
  approvalDate: string;
  createdAt: string;
  price: number;
};

export type PrinterModelRequest = {
  brand: string;
  modelCode: string;
  providencia?: string;
  approvalDate?: string;
  price: number;
};
