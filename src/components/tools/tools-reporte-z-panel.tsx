"use client";

import { ToolsPage } from "@/components/tools/tools-ui";
import { ToolsPrinterMacGuard } from "@/components/tools/tools-printer-sub-page";
import { ToolsReporteZSection } from "@/components/tools/tools-reporte-z-section";
import type { ToolsPrinter } from "@/modules/tools/shared/types";

export function ToolsReporteZPanel({ printer }: { printer: ToolsPrinter }) {
  return (
    <ToolsPrinterMacGuard macAddress={printer.macAddress}>
      <ToolsPage>
        <ToolsReporteZSection printer={printer} />
      </ToolsPage>
    </ToolsPrinterMacGuard>
  );
}
