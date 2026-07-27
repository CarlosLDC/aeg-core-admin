"use client";

import { ToolsHeaderFooterPanel } from "@/components/tools/tools-header-footer-panel";
import { ToolsPrinterOperationPage } from "@/components/tools/tools-printer-operation-page";

export default function ToolsPrinterHeaderFooterPage() {
  return (
    <ToolsPrinterOperationPage>
      {(printer) => <ToolsHeaderFooterPanel printer={printer} />}
    </ToolsPrinterOperationPage>
  );
}
