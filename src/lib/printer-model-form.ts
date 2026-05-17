import type { PrinterModelRequest } from "@/types/printer-model";

export type PrinterModelFormValues = {
  brand: string;
  modelCode: string;
  providencia: string;
  approvalDate: string;
  price: string;
};

export function toPrinterModelRequest(
  values: PrinterModelFormValues,
): PrinterModelRequest | string {
  const brand = values.brand.trim();
  const modelCode = values.modelCode.trim();
  if (!brand) return "La marca es obligatoria.";
  if (!modelCode) return "El código de modelo es obligatorio.";

  const price = Number(values.price);
  if (!Number.isFinite(price) || price < 0) {
    return "El precio debe ser un número mayor o igual a cero.";
  }

  const providencia = values.providencia.trim();
  const approvalDate = values.approvalDate.trim();

  return {
    brand,
    modelCode,
    ...(providencia && { providencia }),
    ...(approvalDate && { approvalDate }),
    price,
  };
}

export function formatPrinterModelPrice(price: number): string {
  return new Intl.NumberFormat("es-VE", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(price);
}

export function formatPrinterModelDate(value: string | undefined): string {
  if (!value) return "—";
  const date = new Date(value.includes("T") ? value : `${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("es-VE", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
