"use client";

import { ToolsPrinterOperationPage } from "@/components/tools/tools-printer-operation-page";
import { ToolsPrinterSummaryPanel } from "@/components/tools/tools-printer-summary-panel";

export default function ToolsPrinterSummaryPage() {
  return (
    <ToolsPrinterOperationPage>
      {(printer) => <ToolsPrinterSummaryPanel printer={printer} />}
    </ToolsPrinterOperationPage>
  );
}
