import { apiFetch } from "@/lib/api";
import { ApiError } from "@/types/auth";
import type {
  DeletePrinterLogsParams,
  DeletePrinterLogsResponse,
  PrinterLogsFilterParams,
  PrinterLogsResponse,
} from "@/types/printer-logs";

export async function fetchPrinterLogs(
  printerId: number,
  params: PrinterLogsFilterParams = {},
): Promise<PrinterLogsResponse> {
  const searchParams = new URLSearchParams();

  if (params.from) searchParams.set("from", params.from);
  if (params.to) searchParams.set("to", params.to);
  if (params.q) searchParams.set("q", params.q);
  if (params.page !== undefined) searchParams.set("page", String(params.page));
  if (params.limit !== undefined) searchParams.set("limit", String(params.limit));
  if (params.order) searchParams.set("order", params.order);

  const qs = searchParams.toString();
  const path = `/api/printers/${printerId}/logs${qs ? `?${qs}` : ""}`;
  return apiFetch<PrinterLogsResponse>(path);
}

export async function deletePrinterLogs(
  printerId: number,
  params: DeletePrinterLogsParams,
): Promise<DeletePrinterLogsResponse> {
  const searchParams = new URLSearchParams();
  if (params.before) searchParams.set("before", params.before);
  if (params.from) searchParams.set("from", params.from);
  if (params.to) searchParams.set("to", params.to);

  const qs = searchParams.toString();
  const path = `/api/printers/${printerId}/logs${qs ? `?${qs}` : ""}`;
  return apiFetch<DeletePrinterLogsResponse>(path, {
    method: "DELETE",
  });
}

export function getPrinterLogsErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    return err.message;
  }
  if (err instanceof Error) {
    return err.message;
  }
  return "Error al procesar logs de la impresora.";
}
