export type AnnualInspectionResponse = {
  id: number;
  printerId: number;
  userId: number;
  sealTampered: boolean;
  notes: string | null;
  createdAt: string;
  photoUrls: string[];
  inspectionDate: string;
  mqttRegistroImpresora?: string | null;
  mqttSetDateRevOAt?: number | null;
  mqttNumeroFacturaPrueba?: number | null;
};

export type AnnualInspectionRequest = {
  printerId: number;
  userId: number;
  sealTampered: boolean;
  notes?: string | null;
  photoUrls: string[];
  inspectionDate?: string | null;
  mqttRegistroImpresora?: string | null;
  mqttSetDateRevOAt?: number | null;
  mqttNumeroFacturaPrueba?: number | null;
};
