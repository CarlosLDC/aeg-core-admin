import { formatInventoryBoxLabel } from "@/lib/inventory-box-form";
import { PRINTER_STATUS_LABELS } from "@/lib/printer-form";
import { normalizePrinterStatus } from "@/lib/printer-status";
import type { InventoryBoxResponse } from "@/types/inventory-box";
import type { PrinterResponse, PrinterStatus } from "@/types/printer";

export type PrinterBoxStatusSummary = {
  status: PrinterStatus;
  label: string;
  count: number;
};

export type PrinterBoxPage = {
  key: string;
  kind: "box" | "unassigned";
  box: InventoryBoxResponse | null;
  title: string;
  subtitle: string | null;
  printers: PrinterResponse[];
  serialRange: string | null;
  statusCounts: PrinterBoxStatusSummary[];
};

function compareSerialAsc(a: PrinterResponse, b: PrinterResponse): number {
  return a.fiscalSerial.localeCompare(b.fiscalSerial, "es", {
    numeric: true,
    sensitivity: "base",
  });
}

function summarizePrintersInBox(printers: PrinterResponse[]): {
  serialRange: string | null;
  statusCounts: PrinterBoxStatusSummary[];
} {
  if (printers.length === 0) {
    return { serialRange: null, statusCounts: [] };
  }

  const first = printers[0].fiscalSerial;
  const last = printers[printers.length - 1].fiscalSerial;
  const serialRange =
    printers.length === 1 ? first : `${first} — ${last}`;

  const countsByStatus = new Map<PrinterStatus, number>();
  for (const printer of printers) {
    const status = normalizePrinterStatus(printer.status);
    countsByStatus.set(status, (countsByStatus.get(status) ?? 0) + 1);
  }

  const statusCounts = Array.from(countsByStatus.entries()).map(
    ([status, count]) => ({
      status,
      label: PRINTER_STATUS_LABELS[status],
      count,
    }),
  );

  return { serialRange, statusCounts };
}

export function buildPrinterBoxPages(params: {
  printers: PrinterResponse[];
  boxes: InventoryBoxResponse[];
  hasActiveFilters: boolean;
}): PrinterBoxPage[] {
  const { printers, boxes, hasActiveFilters } = params;
  const sortedBoxes = [...boxes].sort((a, b) => a.boxNumber - b.boxNumber);

  const printersByBoxId = new Map<number, PrinterResponse[]>();
  const unassignedPrinters: PrinterResponse[] = [];

  for (const printer of printers) {
    if (printer.boxId == null) {
      unassignedPrinters.push(printer);
    } else {
      const bucket = printersByBoxId.get(printer.boxId);
      if (bucket) {
        bucket.push(printer);
      } else {
        printersByBoxId.set(printer.boxId, [printer]);
      }
    }
  }

  const pages: PrinterBoxPage[] = [];

  for (const box of sortedBoxes) {
    const boxPrinters = (printersByBoxId.get(box.id) ?? []).sort(
      compareSerialAsc,
    );
    if (hasActiveFilters && boxPrinters.length === 0) {
      continue;
    }

    const { serialRange, statusCounts } = summarizePrintersInBox(boxPrinters);
    pages.push({
      key: `box-${box.id}`,
      kind: "box",
      box,
      title: formatInventoryBoxLabel(box.boxNumber),
      subtitle: box.observations,
      printers: boxPrinters,
      serialRange,
      statusCounts,
    });
  }

  if (unassignedPrinters.length > 0 || pages.length === 0) {
    unassignedPrinters.sort(compareSerialAsc);
    const { serialRange, statusCounts } =
      summarizePrintersInBox(unassignedPrinters);
    pages.push({
      key: "unassigned",
      kind: "unassigned",
      box: null,
      title: "Sin caja asignada",
      subtitle: "Impresoras fuera de caja o pendientes de empaque",
      printers: unassignedPrinters,
      serialRange,
      statusCounts,
    });
  }

  return pages;
}
