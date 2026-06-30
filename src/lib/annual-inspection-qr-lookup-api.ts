import { apiFetch } from "@/lib/api";
import { ApiError } from "@/types/auth";

export type FiscalBookLookupInspectionByQrResponse = {
  inspectionId: number;
  printerId: number;
  fiscalSerial: string;
  registro: string;
  mac: string;
  fecha: string;
};

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

export function getQrLookupErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "No se pudo verificar el comprobante QR.";
}
