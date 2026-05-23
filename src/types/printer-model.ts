export type PrinterModelResponse = {
  id: number;
  brand: string;
  modelCode: string;
  price: number;
  providencia: string;
  approvalDate: string;
  createdAt: string;
};

export type PrinterModelRequest = {
  brand: string;
  modelCode: string;
  price: number;
  providencia?: string;
  approvalDate?: string;
};
