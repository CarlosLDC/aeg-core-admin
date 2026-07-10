export type ToolsReportZFieldKind = "currency" | "number" | "text";

export type ToolsReportZField = {
  key: string;
  label: string;
  kind: ToolsReportZFieldKind;
};

export type ToolsReportZSection = {
  title: string;
  fields: ToolsReportZField[];
};

export const TOOLS_REPORT_Z_SECTIONS: ToolsReportZSection[] = [
  {
    title: "Información básica",
    fields: [{ key: "NroRepZ", label: "Número de reporte Z", kind: "number" }],
  },
  {
    title: "Fechas y horas",
    fields: [
      { key: "FechaAct", label: "Fecha actual", kind: "text" },
      { key: "HoraAct", label: "Hora actual", kind: "text" },
      { key: "FechaInicioJornada", label: "Fecha inicio jornada", kind: "text" },
      { key: "HoraInicioJornada", label: "Hora inicio jornada", kind: "text" },
    ],
  },
  {
    title: "Facturas",
    fields: [
      { key: "Fac_EXENTO (E)", label: "Exento (E)", kind: "currency" },
      { key: "Fac_BI G (16.00%)", label: "BI G (16.00%)", kind: "currency" },
      { key: "Fac_IVA G (16.00%)", label: "IVA G (16.00%)", kind: "currency" },
      { key: "Fac_BI R (8.00%)", label: "BI R (8.00%)", kind: "currency" },
      { key: "Fac_IVA R (8.00%)", label: "IVA R (8.00%)", kind: "currency" },
      { key: "Fac_BI A (31.00%)", label: "BI A (31.00%)", kind: "currency" },
      { key: "Fac_IVA A (31.00%)", label: "IVA A (31.00%)", kind: "currency" },
      { key: "Fac_PERCIBIDO", label: "Percebido", kind: "currency" },
    ],
  },
  {
    title: "Notas de crédito y débito",
    fields: [
      { key: "NC_EXENTO (E)", label: "NC exento (E)", kind: "currency" },
      { key: "NC_BI G (16.00%)", label: "NC BI G (16.00%)", kind: "currency" },
      { key: "NC_IVA G (16.00%)", label: "NC IVA G (16.00%)", kind: "currency" },
      { key: "NC_BI R (8.00%)", label: "NC BI R (8.00%)", kind: "currency" },
      { key: "NC_IVA R (8.00%)", label: "NC IVA R (8.00%)", kind: "currency" },
      { key: "NC_BI A (31.00%)", label: "NC BI A (31.00%)", kind: "currency" },
      { key: "NC_IVA A (31.00%)", label: "NC IVA A (31.00%)", kind: "currency" },
      { key: "NC_PERCIBIDO", label: "NC percebido", kind: "currency" },
      { key: "ND_EXENTO (E)", label: "ND exento (E)", kind: "currency" },
      { key: "ND_BI G (16.00%)", label: "ND BI G (16.00%)", kind: "currency" },
      { key: "ND_IVA G (16.00%)", label: "ND IVA G (16.00%)", kind: "currency" },
      { key: "ND_BI R (8.00%)", label: "ND BI R (8.00%)", kind: "currency" },
      { key: "ND_IVA R (8.00%)", label: "ND IVA R (8.00%)", kind: "currency" },
      { key: "ND_BI A (31.00%)", label: "ND BI A (31.00%)", kind: "currency" },
      { key: "ND_IVA A (31.00%)", label: "ND IVA A (31.00%)", kind: "currency" },
      { key: "ND_PERCIBIDO", label: "ND percebido", kind: "currency" },
    ],
  },
  {
    title: "Anulaciones",
    fields: [
      { key: "Anu_EXENTO (E)", label: "Anu exento (E)", kind: "currency" },
      { key: "Anu_BI G (16.00%)", label: "Anu BI G (16.00%)", kind: "currency" },
      { key: "Anu_IVA G (16.00%)", label: "Anu IVA G (16.00%)", kind: "currency" },
      { key: "Anu_BI R (8.00%)", label: "Anu BI R (8.00%)", kind: "currency" },
      { key: "Anu_IVA R (8.00%)", label: "Anu IVA R (8.00%)", kind: "currency" },
      { key: "Anu_BI A (31.00%)", label: "Anu BI A (31.00%)", kind: "currency" },
      { key: "Anu_IVA A (31.00%)", label: "Anu IVA A (31.00%)", kind: "currency" },
      { key: "Anu_PERCIBIDO", label: "Anu percebido", kind: "currency" },
    ],
  },
  {
    title: "Descuentos y recargos",
    fields: [
      { key: "Rec_EXENTO (E)", label: "Rec exento (E)", kind: "currency" },
      { key: "Rec_BI G (16.00%)", label: "Rec BI G (16.00%)", kind: "currency" },
      { key: "Rec_IVA G (16.00%)", label: "Rec IVA G (16.00%)", kind: "currency" },
      { key: "Rec_BI R (8.00%)", label: "Rec BI R (8.00%)", kind: "currency" },
      { key: "Rec_IVA R (8.00%)", label: "Rec IVA R (8.00%)", kind: "currency" },
      { key: "Rec_BI A (31.00%)", label: "Rec BI A (31.00%)", kind: "currency" },
      { key: "Rec_IVA A (31.00%)", label: "Rec IVA A (31.00%)", kind: "currency" },
      { key: "Rec_PERCIBIDO", label: "Rec percebido", kind: "currency" },
      { key: "Des_EXENTO (E)", label: "Des exento (E)", kind: "currency" },
      { key: "Des_BI G (16.00%)", label: "Des BI G (16.00%)", kind: "currency" },
      { key: "Des_IVA G (16.00%)", label: "Des IVA G (16.00%)", kind: "currency" },
      { key: "Des_BI R (8.00%)", label: "Des BI R (8.00%)", kind: "currency" },
      { key: "Des_IVA R (8.00%)", label: "Des IVA R (8.00%)", kind: "currency" },
      { key: "Des_BI A (31.00%)", label: "Des BI A (31.00%)", kind: "currency" },
      { key: "Des_IVA A (31.00%)", label: "Des IVA A (31.00%)", kind: "currency" },
      { key: "Des_PERCIBIDO", label: "Des percebido", kind: "currency" },
    ],
  },
  {
    title: "Contadores",
    fields: [
      { key: "CantFactDia", label: "Cantidad facturas del día", kind: "number" },
      { key: "NroUltFac", label: "Número última factura", kind: "number" },
      { key: "FechaUltFac", label: "Fecha última factura", kind: "text" },
      { key: "HoraUltFac", label: "Hora última factura", kind: "text" },
      { key: "CantNotCre", label: "Cantidad notas de crédito", kind: "number" },
      { key: "NroUltNC", label: "Número última NC", kind: "number" },
      { key: "FechaUltNC", label: "Fecha última NC", kind: "text" },
      { key: "HoraUltNC", label: "Hora última NC", kind: "text" },
      { key: "CantNotDeb", label: "Cantidad notas de débito", kind: "number" },
      { key: "NroUltND", label: "Número última ND", kind: "number" },
      { key: "FechaUltND", label: "Fecha última ND", kind: "text" },
      { key: "HoraUltND", label: "Hora última ND", kind: "text" },
      { key: "CantDNF", label: "Cantidad DNF", kind: "number" },
      { key: "NroUltDNF", label: "Número último DNF", kind: "number" },
      { key: "FechaUltDNF", label: "Fecha último DNF", kind: "text" },
      { key: "HoraUltDNF", label: "Hora último DNF", kind: "text" },
    ],
  },
  {
    title: "Métodos de pago",
    fields: [
      { key: "[1]Total_EFECTIVO", label: "Efectivo", kind: "currency" },
      { key: "[2]Total_BIOPAGO", label: "BiPago", kind: "currency" },
      { key: "[3]Total_PAGO-MOVIL", label: "Pago móvil", kind: "currency" },
      { key: "[4]Total_CASHEA", label: "Cashea", kind: "currency" },
      { key: "[5]Total_TRANSFERENCIAS", label: "Transferencias", kind: "currency" },
      { key: "[6]Total_TARJETA-DEBITO", label: "Tarjeta débito", kind: "currency" },
      { key: "[7]Total_TARJETA-CREDIO", label: "Tarjeta crédito", kind: "currency" },
      { key: "[8]Total_USD-EFCT", label: "USD efectivo", kind: "currency" },
      { key: "[9]Total_ZELLE", label: "Zelle", kind: "currency" },
      {
        key: "[10]Total_FALTANTE-O-CREDITO",
        label: "Faltante o crédito",
        kind: "currency",
      },
    ],
  },
  {
    title: "Totales finales",
    fields: [
      { key: "Total_Gaveta", label: "Total gaveta", kind: "currency" },
      {
        key: "Total_Pago en moneda extranjera",
        label: "Total pago en moneda extranjera",
        kind: "currency",
      },
      {
        key: "Total_IVA IGTF (3.00%)",
        label: "Total IVA IGTF (3.00%)",
        kind: "currency",
      },
    ],
  },
];

const KNOWN_REPORT_Z_KEYS = new Set(
  TOOLS_REPORT_Z_SECTIONS.flatMap((section) =>
    section.fields.map((field) => field.key),
  ),
);

export function formatToolsReportZCurrency(amount: unknown): string {
  if (amount == null || amount === "") {
    return "-";
  }

  const numeric =
    typeof amount === "number"
      ? amount
      : typeof amount === "string" && amount.trim().length > 0
        ? Number(amount)
        : Number.NaN;

  if (!Number.isFinite(numeric)) {
    return String(amount);
  }

  const realAmount = numeric / 100;
  return `Bs. ${realAmount.toLocaleString("es-VE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatToolsReportZFieldValue(
  value: unknown,
  kind: ToolsReportZFieldKind,
): string {
  if (value == null || value === "") {
    return kind === "text" ? "-" : kind === "currency" ? formatToolsReportZCurrency(0) : "0";
  }

  if (kind === "currency") {
    return formatToolsReportZCurrency(value);
  }

  if (kind === "number") {
    const numeric =
      typeof value === "number"
        ? value
        : typeof value === "string"
          ? Number(value)
          : Number.NaN;
    return Number.isFinite(numeric) ? String(numeric) : String(value);
  }

  return String(value);
}

export function resolveToolsReportZNumber(
  report: Record<string, unknown>,
): number | null {
  const raw = report.NroRepZ;
  const numeric =
    typeof raw === "number"
      ? raw
      : typeof raw === "string"
        ? Number(raw)
        : Number.NaN;
  return Number.isFinite(numeric) ? Math.trunc(numeric) : null;
}

export function listToolsReportZExtraFields(
  report: Record<string, unknown>,
): Array<{ key: string; value: string }> {
  return Object.entries(report)
    .filter(([key]) => !KNOWN_REPORT_Z_KEYS.has(key))
    .sort(([left], [right]) => left.localeCompare(right, "es"))
    .map(([key, value]) => ({
      key,
      value:
        typeof value === "object" && value != null
          ? JSON.stringify(value)
          : String(value),
    }));
}
