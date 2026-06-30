import { apiFetch } from "@/lib/api";

export type FiscalBookLookupInspectionByQrResponse = {
  inspectionId: number;
  printerId: number;
  fiscalSerial: string;
  registro: string;
  mac: string;
  fecha: string;
};

export const QR_INVALID_CODE_MESSAGE = "Código QR no válido";

export async function lookupInspectionByQr(
  qrCodigo: string,
): Promise<FiscalBookLookupInspectionByQrResponse> {
  return apiFetch<FiscalBookLookupInspectionByQrResponse>(
    "/api/fiscal-books/lookup-inspection-by-qr",
    {
      method: "POST",
      body: JSON.stringify({ qrCodigo }),
    },
  );
}

export function getQrLookupErrorMessage(_error: unknown): string {
  return QR_INVALID_CODE_MESSAGE;
}
