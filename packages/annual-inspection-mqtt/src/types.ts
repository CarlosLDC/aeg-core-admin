export type FiscalMqttResponseItem = {
  cmd?: string | null;
  code?: number | null;
  dataD?: number | null;
  dataS?: string | null;
};

export type AnnualInspectionStaInfResponse = {
  registroImpresora: string;
  topic: string;
  fiscalSerial: string;
  macAddress: string;
  commandPayload: string;
  response: FiscalMqttResponseItem;
  publishedAt: string;
};

export type AnnualInspectionTestInvoiceResponse = {
  numeroFacturaPrueba: number;
  topic: string;
  fiscalSerial: string;
  macAddress: string;
  commandPayload: string;
  response: FiscalMqttResponseItem[];
  publishedAt: string;
};

export type AnnualInspectionTestCreditNoteResponse = {
  topic: string;
  fiscalSerial: string;
  macAddress: string;
  commandPayload: string;
  response: FiscalMqttResponseItem[];
  publishedAt: string;
};

export type AnnualInspectionSubmitResponse = {
  dataTimestamp: number;
  inspAo: {
    precinto: string;
    etiqFisc: string;
    impFact: string;
    impNC: string;
    sensPapel: string;
  };
  topic: string;
  fiscalSerial: string;
  macAddress: string;
  commandPayload: string;
  response: FiscalMqttResponseItem;
  publishedAt: string;
};

export type AnnualInspectionChecklistKey =
  | "chkPrecinto"
  | "chkEtiquetaFiscal"
  | "chkFactura"
  | "chkNotaCredito"
  | "chkSensorPapel";

export type AnnualInspectionChecklistState = Record<
  AnnualInspectionChecklistKey,
  boolean
>;

export type AnnualInspectionMqttFlowState = {
  registroImpresora: string;
  fiscalSerial: string;
  printerId: number;
  productDescription: string;
  numeroFacturaPrueba: number | null;
  checklist: AnnualInspectionChecklistState;
};

/** Resultado del ritual MQTT listo para persistir en inspecciones_anuales. */
export type AnnualInspectionMqttCompletion = {
  checklist: AnnualInspectionChecklistState;
  registroImpresora: string;
  numeroFacturaPrueba: number | null;
  mqttSetDateRevOTimestamp: number;
};

export type AnnualInspectionMqttPrinterRef = {
  status: string;
  clientId?: number | null;
  macAddress?: string | null;
  fiscalSerial?: string | null;
};
