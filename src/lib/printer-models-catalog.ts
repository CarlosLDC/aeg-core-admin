import {
  fetchPrinterModelById,
  fetchPrinterModels,
} from "@/lib/printer-models-api";
import type { PrinterModelResponse } from "@/types/printer-model";

export function missingPrinterModelIds(
  printers: Array<{ modelId: number }>,
  catalog: PrinterModelResponse[],
): number[] {
  const known = new Set(catalog.map((m) => m.id));
  const needed = new Set(printers.map((p) => p.modelId));
  return [...needed].filter((id) => !known.has(id));
}

export function mergePrinterModelsCatalog(
  ...sources: PrinterModelResponse[][]
): PrinterModelResponse[] {
  const byId = new Map<number, PrinterModelResponse>();
  for (const source of sources) {
    for (const model of source) {
      byId.set(model.id, model);
    }
  }
  return [...byId.values()];
}

/** Completa el catálogo con GET por id y, si faltan, con el listado (alcance distribuidor). */
export async function fetchMissingPrinterModels(
  printers: Array<{ modelId: number }>,
  catalog: PrinterModelResponse[],
): Promise<PrinterModelResponse[]> {
  let merged = catalog;
  let missing = missingPrinterModelIds(printers, merged);
  if (missing.length === 0) return merged;

  const fetched = await Promise.all(
    missing.map((id) => fetchPrinterModelById(id).catch(() => null)),
  );
  const extra = fetched.filter((m): m is PrinterModelResponse => m != null);
  if (extra.length > 0) {
    merged = mergePrinterModelsCatalog(merged, extra);
    missing = missingPrinterModelIds(printers, merged);
  }

  if (missing.length > 0) {
    const list = await fetchPrinterModels().catch(
      () => [] as PrinterModelResponse[],
    );
    merged = mergePrinterModelsCatalog(merged, list);
  }

  return merged;
}
