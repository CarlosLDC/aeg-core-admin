import { fetchClients } from "@/lib/clients-api";
import { fetchPrinterModels } from "@/lib/printer-models-api";
import { fetchPrinters } from "@/lib/printers-api";
import type { ClientResponse } from "@/types/branch-role";
import type { PrinterModelResponse } from "@/types/printer-model";
import type { PrinterResponse } from "@/types/printer";

export type ToolsPrinterCatalog = {
  printers: PrinterResponse[];
  clients: ClientResponse[];
  models: PrinterModelResponse[];
};

export async function loadToolsPrinterCatalog(): Promise<ToolsPrinterCatalog> {
  const [printers, clients, models] = await Promise.all([
    fetchPrinters(),
    fetchClients().catch(() => [] as ClientResponse[]),
    fetchPrinterModels().catch(() => [] as PrinterModelResponse[]),
  ]);

  return { printers, clients, models };
}
