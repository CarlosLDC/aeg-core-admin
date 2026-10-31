import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Cpu,
  CreditCard,
  FileStack,
  FlaskConical,
  Palette,
  Plug,
  Printer,
  ReceiptText,
  ScrollText,
  Wifi,
} from "lucide-react";
import {
  toolsPrinterFormasPagoPath,
  toolsPrinterHeaderFooterPath,
  toolsPrinterSummaryPath,
  toolsPrinterWifiPath,
  toolsPrinterBrokerMigrationPath,
  toolsPrinterPeripheralsPath,
  toolsPrinterTicketCustomizationPath,
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
    description: "Generar, consultar y transmitir reportes Z y X.",
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
    description: "Visualizar y reimprimir documentos.",
    icon: Printer,
    tone: "indigo",
  },
  headerFooter: {
    id: "encabezado-pie",
    title: "Encabezado y pie",
    description: "Leer y editar el encabezado y pie de ticket en vista de factura.",
    icon: ReceiptText,
    tone: "rose",
  },
  peripherals: {
    id: "perifericos",
    title: "Periféricos",
    description: "Configurar gaveta de dinero y visor de precios.",
    icon: Plug,
    tone: "teal",
  },
  ticketCustomization: {
    id: "personalizacion-ticket",
    title: "Personalización del ticket",
    description: "Logo y estilos de fuente del encabezado y pie.",
    icon: Palette,
    tone: "violet",
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
  brokerMigration: {
    id: "broker-migration",
    title: "Actualizar firmware",
    description: "Actualizar el firmware de la impresora.",
    icon: Cpu,
    tone: "sky",
  },
} as const satisfies Record<string, ToolsSectionConfig>;

export type ToolsSectionKey = keyof typeof TOOLS_SECTIONS;

export const TOOLS_PRINTER_NAV_SECTIONS = [
  "summary",
  "wifi",
  "formasPago",
  "headerFooter",
  "ticketCustomization",
  "peripherals",
  "brokerMigration",
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
    case "headerFooter":
      return toolsPrinterHeaderFooterPath(serial);
    case "ticketCustomization":
      return toolsPrinterTicketCustomizationPath(serial);
    case "peripherals":
      return toolsPrinterPeripheralsPath(serial);
    case "brokerMigration":
      return toolsPrinterBrokerMigrationPath(serial);
    default: {
      const _exhaustive: never = section;
      return _exhaustive;
    }
  }
}
