"use client";

import { ToolsPage } from "@/components/tools/tools-ui";
import { ToolsPrinterMacGuard } from "@/components/tools/tools-printer-sub-page";
import { ToolsTestDocumentsSection } from "@/components/tools/tools-test-documents-section";
import type { ToolsPrinter } from "@/modules/tools/shared/types";

export function ToolsTestDocumentsPanel({ printer }: { printer: ToolsPrinter }) {
  return (
    <ToolsPrinterMacGuard macAddress={printer.macAddress}>
      <ToolsPage>
        <ToolsTestDocumentsSection printer={printer} />
      </ToolsPage>
    </ToolsPrinterMacGuard>
  );
}
