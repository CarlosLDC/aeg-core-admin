import { fetchPrinterModelById } from "@/lib/printer-models-api";
import type { PrinterModelResponse } from "@/types/printer-model";

export function missingPrinterModelIds(
  printers: Array<{ modelId: number }>,
  catalog: PrinterModelResponse[],
): number[] {
  const known = new Set(catalog.map((m) => m.id));
  const needed = new Set(printers.map((p) => p.modelId));
  return [...needed].filter((id) => !known.has(id));
}

/** Completa el catálogo con GET por id cuando el listado no trae todos los modelos referenciados. */
export async function fetchMissingPrinterModels(
  printers: Array<{ modelId: number }>,
  catalog: PrinterModelResponse[],
): Promise<PrinterModelResponse[]> {
  const missing = missingPrinterModelIds(printers, catalog);
  if (missing.length === 0) return catalog;

  const fetched = await Promise.all(
    missing.map((id) => fetchPrinterModelById(id).catch(() => null)),
  );
  const extra = fetched.filter((m): m is PrinterModelResponse => m != null);
  if (extra.length === 0) return catalog;

  const byId = new Map(catalog.map((m) => [m.id, m]));
  for (const m of extra) byId.set(m.id, m);
  return [...byId.values()];
}
