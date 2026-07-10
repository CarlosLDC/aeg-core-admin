import type { LucideIcon } from "lucide-react";
import {
  Activity,
  AlignLeft,
  AlignRight,
  CreditCard,
  FileStack,
  FlaskConical,
  Printer,
  ScrollText,
  Wifi,
} from "lucide-react";
import {
  toolsPrinterFooterPath,
  toolsPrinterFormasPagoPath,
  toolsPrinterHeaderPath,
  toolsPrinterSummaryPath,
  toolsPrinterWifiPath,
} from "@/lib/resource-routes";

export type ToolsSectionTone =
  | "sky"
  | "emerald"
  | "violet"
  | "amber"
  | "indigo"
  | "teal"
  | "rose"
  | "slate";

export type ToolsSectionConfig = {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  tone: ToolsSectionTone;
};

export const TOOLS_SECTIONS = {
  wifi: {
    id: "wifi",
    title: "Configuración WiFi",
    description: "Escanear redes y conectar la impresora.",
    icon: Wifi,
    tone: "sky",
  },
  reporteZ: {
    id: "reporte-z",
    title: "Reporte Z",
    description: "Generar, consultar y transmitir reportes Z.",
    icon: ScrollText,
    tone: "violet",
  },
  formasPago: {
    id: "formas-pago",
    title: "Formas de pago",
    description: "Consultar y editar descripciones de pago.",
    icon: CreditCard,
    tone: "emerald",
  },
  testDocuments: {
    id: "documentos-prueba",
    title: "Documentos de prueba",
    description: "Generar documentos fiscales de prueba en la impresora.",
    icon: FlaskConical,
    tone: "amber",
  },
  reprint: {
    id: "reimpresion",
    title: "Reimpresión",
    description: "Visualizar, reimprimir documentos y generar reporte X.",
    icon: Printer,
    tone: "indigo",
  },
  header: {
    id: "encabezado",
    title: "Encabezado",
    description: "Leer y editar el encabezado fiscal de la impresora.",
    icon: AlignLeft,
    tone: "rose",
  },
  footer: {
    id: "pie-de-pagina",
    title: "Pie de página",
    description: "Leer y editar el pie de ticket de la impresora.",
    icon: AlignRight,
    tone: "amber",
  },
  status: {
    id: "status",
    title: "Estado en línea",
    description: "Conectividad SENIAT y red de la impresora.",
    icon: Activity,
    tone: "teal",
  },
  summary: {
    id: "resumen",
    title: "Resumen",
    description: "Datos de la impresora, cliente y distribuidor.",
    icon: FileStack,
    tone: "slate",
  },
} as const satisfies Record<string, ToolsSectionConfig>;

export type ToolsSectionKey = keyof typeof TOOLS_SECTIONS;

export const TOOLS_PRINTER_NAV_SECTIONS = [
  "summary",
  "wifi",
  "formasPago",
  "header",
  "footer",
] as const satisfies readonly ToolsSectionKey[];

export type ToolsPrinterNavSectionKey =
  (typeof TOOLS_PRINTER_NAV_SECTIONS)[number];

export function toolsPrinterSectionHref(
  serial: string,
  section: ToolsPrinterNavSectionKey,
): string {
  switch (section) {
    case "summary":
      return toolsPrinterSummaryPath(serial);
    case "wifi":
      return toolsPrinterWifiPath(serial);
    case "formasPago":
      return toolsPrinterFormasPagoPath(serial);
    case "header":
      return toolsPrinterHeaderPath(serial);
    case "footer":
      return toolsPrinterFooterPath(serial);
    default: {
      const _exhaustive: never = section;
      return _exhaustive;
    }
  }
}
