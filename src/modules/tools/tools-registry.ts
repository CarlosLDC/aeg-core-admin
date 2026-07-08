export type ToolsModuleStatus = "planned" | "skeleton" | "migrated";
export type ToolsModulePriority = "foundation" | "high" | "medium" | "low";

export type ToolsModule = {
  id: string;
  title: string;
  description: string;
  sourcePath: string;
  targetPath: string;
  route: string | null;
  status: ToolsModuleStatus;
  dependsOn: string[];
  priority: ToolsModulePriority;
  notes?: string;
};

export const TOOLS_MODULES: ToolsModule[] = [
  {
    id: "tools-shared-formatters",
    title: "Formatters and printer mapping",
    description:
      "Formatters, printer normalization and other pure helpers shared by the Tools dashboard and detail views.",
    sourcePath:
      "C:\\Users\\sirgo\\Documents\\aeg-tools\\aeg-tools-next\\lib\\formatters.ts; C:\\Users\\sirgo\\Documents\\aeg-tools\\aeg-tools-next\\types\\printer.ts",
    targetPath:
      "C:\\Users\\sirgo\\Documents\\aeg-core-admin\\src\\modules\\tools\\shared",
    route: null,
    status: "migrated",
    dependsOn: [],
    priority: "foundation",
  },
  {
    id: "tools-shared-escpos",
    title: "ESC/POS parser and renderer",
    description:
      "Shared ESC/POS parsing and HTML conversion used by reprint previews and printable documents.",
    sourcePath:
      "C:\\Users\\sirgo\\Documents\\aeg-tools\\aeg-tools-next\\lib\\escPosToHtml.ts",
    targetPath:
      "C:\\Users\\sirgo\\Documents\\aeg-core-admin\\src\\modules\\tools\\escpos",
    route: null,
    status: "migrated",
    dependsOn: [],
    priority: "foundation",
  },
  {
    id: "tools-shared-api",
    title: "Tools API client boundary",
    description:
      "Boundary for the external Tools API client and fetch helpers until the final auth/API strategy is defined.",
    sourcePath:
      "C:\\Users\\sirgo\\Documents\\aeg-tools\\aeg-tools-next\\lib\\external-api.ts; C:\\Users\\sirgo\\Documents\\aeg-tools\\aeg-tools-next\\lib\\api.ts",
    targetPath:
      "C:\\Users\\sirgo\\Documents\\aeg-core-admin\\src\\modules\\tools\\shared",
    route: null,
    status: "migrated",
    dependsOn: ["tools-auth"],
    priority: "foundation",
    notes:
      "Usa fetchPrinters/fetchClients de aeg-core con JWT admin; no API legacy Seenode.",
  },
  {
    id: "tools-auth",
    title: "Tools auth session model",
    description:
      "Session types and cookie/session helpers for Tools routes inside admin.",
    sourcePath:
      "C:\\Users\\sirgo\\Documents\\aeg-tools\\aeg-tools-next\\lib\\auth\\session.ts; C:\\Users\\sirgo\\Documents\\aeg-tools\\aeg-tools-next\\types\\auth.ts; C:\\Users\\sirgo\\Documents\\aeg-tools\\aeg-tools-next\\app\\api\\auth",
    targetPath:
      "C:\\Users\\sirgo\\Documents\\aeg-core-admin\\src\\modules\\tools\\auth",
    route: null,
    status: "migrated",
    dependsOn: [],
    priority: "foundation",
    notes: "Reutiliza auth admin; no sesión Tools separada.",
  },
  {
    id: "tools-printers-dashboard",
    title: "Tools printers dashboard",
    description:
      "Distributor-oriented dashboard for production printers, search state and field operations entry points.",
    sourcePath:
      "C:\\Users\\sirgo\\Documents\\aeg-tools\\aeg-tools-next\\components\\printers\\PrinterDashboard.tsx",
    targetPath:
      "C:\\Users\\sirgo\\Documents\\aeg-core-admin\\src\\modules\\tools\\printers",
    route: "/tools",
    status: "migrated",
    dependsOn: ["tools-shared-formatters", "tools-shared-api"],
    priority: "high",
    notes: "UI en src/components/tools/tools-printers-manager.tsx",
  },
  {
    id: "tools-printers-table",
    title: "Tools printer table",
    description:
      "Search, filters, table rendering and status strip for the dashboard printer list.",
    sourcePath:
      "C:\\Users\\sirgo\\Documents\\aeg-tools\\aeg-tools-next\\components\\printers\\PrinterTable.tsx; C:\\Users\\sirgo\\Documents\\aeg-tools\\aeg-tools-next\\components\\printers\\PrinterSearch.tsx; C:\\Users\\sirgo\\Documents\\aeg-tools\\aeg-tools-next\\components\\printers\\PrinterStatusBar.tsx",
    targetPath:
      "C:\\Users\\sirgo\\Documents\\aeg-core-admin\\src\\modules\\tools\\printers",
    route: "/tools",
    status: "migrated",
    dependsOn: ["tools-printers-dashboard", "tools-shared-formatters"],
    priority: "high",
    notes: "Integrado en ToolsPrintersManager con DataTableToolbar admin.",
  },
  {
    id: "tools-printer-detail",
    title: "Tools printer detail shell",
    description:
      "Printer detail hub with field-operation panels and entry points for MQTT workflows.",
    sourcePath:
      "C:\\Users\\sirgo\\Documents\\aeg-tools\\aeg-tools-next\\components\\printers\\PrinterDetailShell.tsx; C:\\Users\\sirgo\\Documents\\aeg-tools\\aeg-tools-next\\components\\printers\\SubManagerPanel.tsx",
    targetPath:
      "C:\\Users\\sirgo\\Documents\\aeg-core-admin\\src\\modules\\tools\\printers",
    route: "/tools/printers/[serial]",
    status: "migrated",
    dependsOn: ["tools-printers-dashboard", "tools-mqtt-core", "tools-shared-escpos"],
    priority: "high",
    notes:
      "Detalle con status bar MQTT, reimpresión y subrutas operativas.",
  },
  {
    id: "tools-mqtt-core",
    title: "Tools MQTT core",
    description:
      "Broker state, printer connection, command publishing and event streaming for Tools operations.",
    sourcePath:
      "C:\\Users\\sirgo\\Documents\\aeg-tools\\aeg-tools-next\\lib\\mqtt; C:\\Users\\sirgo\\Documents\\aeg-tools\\aeg-tools-next\\app\\api\\mqtt\\connect; C:\\Users\\sirgo\\Documents\\aeg-tools\\aeg-tools-next\\app\\api\\mqtt\\status; C:\\Users\\sirgo\\Documents\\aeg-tools\\aeg-tools-next\\app\\api\\mqtt\\events",
    targetPath:
      "C:\\Users\\sirgo\\Documents\\aeg-core-admin\\src\\modules\\tools\\mqtt",
    route: null,
    status: "migrated",
    dependsOn: ["tools-auth"],
    priority: "foundation",
    notes:
      "Proxy en aeg-core /api/mqtt/tools/*; cliente admin en tools-mqtt-api.ts.",
  },
  {
    id: "tools-reprint",
    title: "Reprint documents",
    description:
      "Reprint UI for invoices and fiscal documents backed by MQTT commands and ESC/POS previews.",
    sourcePath:
      "C:\\Users\\sirgo\\Documents\\aeg-tools\\aeg-tools-next\\components\\reprint\\ReprintDocumentPanel.tsx; C:\\Users\\sirgo\\Documents\\aeg-tools\\aeg-tools-next\\app\\api\\mqtt\\reprint",
    targetPath:
      "C:\\Users\\sirgo\\Documents\\aeg-core-admin\\src\\modules\\tools\\reprint",
    route: "/tools/printers/[serial]",
    status: "migrated",
    dependsOn: ["tools-mqtt-core", "tools-shared-escpos", "tools-printer-detail"],
    priority: "high",
    notes: "tools-reprint-panel.tsx en detalle de impresora.",
  },
  {
    id: "tools-reporte-z",
    title: "Reporte Z",
    description:
      "Reporte Z workflow and UI for reading and transmitting Z reports from a printer.",
    sourcePath:
      "C:\\Users\\sirgo\\Documents\\aeg-tools\\aeg-tools-next\\components\\reporte-z\\ReporteZPanel.tsx; C:\\Users\\sirgo\\Documents\\aeg-tools\\aeg-tools-next\\app\\api\\mqtt\\reports-z",
    targetPath:
      "C:\\Users\\sirgo\\Documents\\aeg-core-admin\\src\\modules\\tools\\reporte-z",
    route: "/tools/printers/[serial]/reporte-z",
    status: "migrated",
    dependsOn: ["tools-mqtt-core", "tools-printer-detail"],
    priority: "high",
    notes: "tools-reporte-z-panel.tsx",
  },
  {
    id: "tools-report-x",
    title: "Reporte X",
    description:
      "Report X workflow exposed from the printer detail once the MQTT proxy and UI are ported.",
    sourcePath:
      "C:\\Users\\sirgo\\Documents\\aeg-tools\\aeg-tools-next\\app\\api\\mqtt\\report-x; C:\\Users\\sirgo\\Documents\\aeg-tools\\reportXMqtt.js",
    targetPath:
      "C:\\Users\\sirgo\\Documents\\aeg-core-admin\\src\\modules\\tools\\report-x",
    route: "/tools/printers/[serial]",
    status: "migrated",
    dependsOn: ["tools-mqtt-core", "tools-printer-detail"],
    priority: "medium",
    notes: "Integrado en tools-reprint-panel.",
  },
  {
    id: "tools-wifi",
    title: "WiFi configuration",
    description:
      "WiFi read/write workflow for a printer, exposed as a dedicated nested route.",
    sourcePath:
      "C:\\Users\\sirgo\\Documents\\aeg-tools\\aeg-tools-next\\components\\printers\\WifiConfigPanel.tsx; C:\\Users\\sirgo\\Documents\\aeg-tools\\aeg-tools-next\\app\\api\\mqtt\\wifi",
    targetPath:
      "C:\\Users\\sirgo\\Documents\\aeg-core-admin\\src\\modules\\tools\\wifi",
    route: "/tools/printers/[serial]/wifi",
    status: "migrated",
    dependsOn: ["tools-mqtt-core", "tools-printer-detail"],
    priority: "high",
    notes: "tools-wifi-panel.tsx",
  },
  {
    id: "tools-formas-pago",
    title: "Formas de pago",
    description:
      "Payment methods workflow and nested route for field users operating a printer.",
    sourcePath:
      "C:\\Users\\sirgo\\Documents\\aeg-tools\\aeg-tools-next\\components\\printers\\FormasPagoPanel.tsx; C:\\Users\\sirgo\\Documents\\aeg-tools\\aeg-tools-next\\app\\api\\mqtt\\formas-pago",
    targetPath:
      "C:\\Users\\sirgo\\Documents\\aeg-core-admin\\src\\modules\\tools\\formas-pago",
    route: "/tools/printers/[serial]/formas-pago",
    status: "migrated",
    dependsOn: ["tools-mqtt-core", "tools-printer-detail"],
    priority: "high",
    notes: "tools-formas-pago-panel.tsx",
  },
  {
    id: "tools-header-footer",
    title: "Header and footer editing",
    description:
      "Header/footer commands for fiscal ticket customization from the printer detail workflow.",
    sourcePath:
      "C:\\Users\\sirgo\\Documents\\aeg-tools\\aeg-tools-next\\app\\api\\mqtt\\header; C:\\Users\\sirgo\\Documents\\aeg-tools\\aeg-tools-next\\app\\api\\mqtt\\footer",
    targetPath:
      "C:\\Users\\sirgo\\Documents\\aeg-core-admin\\src\\modules\\tools\\header-footer",
    route: "/tools/printers/[serial]",
    status: "migrated",
    dependsOn: ["tools-mqtt-core", "tools-printer-detail"],
    priority: "medium",
    notes: "Header/footer en tools-reprint-panel.",
  },
  {
    id: "tools-pdf",
    title: "PDF download service",
    description:
      "Server-side PDF generation and download plumbing for Tools printable outputs.",
    sourcePath:
      "C:\\Users\\sirgo\\Documents\\aeg-tools\\aeg-tools-next\\lib\\pdf.ts; C:\\Users\\sirgo\\Documents\\aeg-tools\\aeg-tools-next\\app\\api\\pdf\\download",
    targetPath:
      "C:\\Users\\sirgo\\Documents\\aeg-core-admin\\src\\modules\\tools\\pdf",
    route: null,
    status: "planned",
    dependsOn: ["tools-shared-escpos"],
    priority: "medium",
    notes: "Server runtime and dependency wiring are deferred to the next prompt.",
  },
  {
    id: "tools-ui-kit",
    title: "Tools UI kit review",
    description:
      "Comparison layer between aeg-tools-next UI primitives and the existing admin component library.",
    sourcePath:
      "C:\\Users\\sirgo\\Documents\\aeg-tools\\aeg-tools-next\\components\\ui",
    targetPath:
      "C:\\Users\\sirgo\\Documents\\aeg-core-admin\\src\\modules\\tools\\shared",
    route: null,
    status: "planned",
    dependsOn: [],
    priority: "low",
    notes:
      "Prefer admin UI components by default; only port gaps when a concrete module needs them.",
  },
  {
    id: "tools-test-documents",
    title: "Test documents",
    description:
      "Diagnostic fiscal document flows that still live only in the Electron codebase.",
    sourcePath:
      "C:\\Users\\sirgo\\Documents\\aeg-tools\\testDocumentsMqtt.js; C:\\Users\\sirgo\\Documents\\aeg-tools\\pages\\printer-details\\testDocumentsManager.js",
    targetPath:
      "C:\\Users\\sirgo\\Documents\\aeg-core-admin\\src\\modules\\tools\\reprint",
    route: "/tools/printers/[serial]",
    status: "planned",
    dependsOn: ["tools-mqtt-core", "tools-reprint"],
    priority: "medium",
  },
  {
    id: "tools-theme",
    title: "Legacy theme manager review",
    description:
      "Evaluate the old Tools theme toggles against the global admin theme before migrating anything.",
    sourcePath:
      "C:\\Users\\sirgo\\Documents\\aeg-tools\\shared\\modules\\themeManager.js",
    targetPath:
      "C:\\Users\\sirgo\\Documents\\aeg-core-admin\\src\\modules\\tools\\shared",
    route: null,
    status: "planned",
    dependsOn: [],
    priority: "low",
    notes: "Likely no direct migration because admin already owns the global theme.",
  },
  {
    id: "tools-pagination",
    title: "Legacy pagination review",
    description:
      "Review the old nine-row pagination pattern and replace it with current admin table primitives if needed.",
    sourcePath:
      "C:\\Users\\sirgo\\Documents\\aeg-tools\\shared\\modules\\paginationManager.js",
    targetPath:
      "C:\\Users\\sirgo\\Documents\\aeg-core-admin\\src\\modules\\tools\\shared",
    route: "/tools",
    status: "planned",
    dependsOn: ["tools-printers-table"],
    priority: "low",
    notes: "Prefer existing admin pagination and table patterns over a direct port.",
  },
];

export function findToolsModule(id: string): ToolsModule | undefined {
  return TOOLS_MODULES.find((module) => module.id === id);
}
