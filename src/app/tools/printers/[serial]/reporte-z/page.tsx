"use client";

import { ToolsPrinterOperationPage } from "@/components/tools/tools-printer-operation-page";
import { ToolsReporteZPanel } from "@/components/tools/tools-reporte-z-panel";

export default function ToolsPrinterReporteZPage() {
  return (
    <ToolsPrinterOperationPage>
      {(printer) => <ToolsReporteZPanel printer={printer} />}
    </ToolsPrinterOperationPage>
  );
}
