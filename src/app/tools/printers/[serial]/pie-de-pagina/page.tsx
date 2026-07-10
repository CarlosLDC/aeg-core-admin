"use client";

import { ToolsFooterPanel } from "@/components/tools/tools-footer-panel";
import { ToolsPrinterOperationPage } from "@/components/tools/tools-printer-operation-page";

export default function ToolsPrinterFooterPage() {
  return (
    <ToolsPrinterOperationPage>
      {(printer) => <ToolsFooterPanel printer={printer} />}
    </ToolsPrinterOperationPage>
  );
}
