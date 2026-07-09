import type { LucideIcon } from "lucide-react";
import {
  Activity,
  CreditCard,
  FileStack,
  FlaskConical,
  Printer,
  ScrollText,
  Wifi,
} from "lucide-react";
import {
  toolsPrinterFormasPagoPath,
  toolsPrinterReporteZPath,
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
    id: "test-documents",
    title: "Documentos de prueba",
    description: "Generar documentos fiscales de prueba en la impresora.",
    icon: FlaskConical,
    tone: "amber",
  },
  reprint: {
    id: "reprint",
    title: "Reimpresión",
    description: "Reimprimir documentos y editar encabezado o pie.",
    icon: Printer,
    tone: "indigo",
  },
  status: {
    id: "status",
    title: "Estado en línea",
    description: "Conectividad SENIAT y red de la impresora.",
    icon: Activity,
    tone: "teal",
  },
  summary: {
    id: "summary",
    title: "Resumen",
    description: "Datos operativos de la impresora seleccionada.",
    icon: FileStack,
    tone: "slate",
  },
} as const satisfies Record<string, ToolsSectionConfig>;

export type ToolsSectionKey = keyof typeof TOOLS_SECTIONS;

export const TOOLS_PRINTER_NAV_SECTIONS = [
  "wifi",
  "reporteZ",
  "formasPago",
] as const satisfies readonly ToolsSectionKey[];

export type ToolsPrinterNavSectionKey =
  (typeof TOOLS_PRINTER_NAV_SECTIONS)[number];

export function toolsPrinterSectionHref(
  serial: string,
  section: ToolsPrinterNavSectionKey,
): string {
  switch (section) {
    case "wifi":
      return toolsPrinterWifiPath(serial);
    case "reporteZ":
      return toolsPrinterReporteZPath(serial);
    case "formasPago":
      return toolsPrinterFormasPagoPath(serial);
  }
}
