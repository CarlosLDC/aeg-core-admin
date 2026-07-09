"use client";

import { ToolsPrinterOperationPage } from "@/components/tools/tools-printer-operation-page";
import { ToolsTestDocumentsPanel } from "@/components/tools/tools-test-documents-panel";

export default function ToolsPrinterTestDocumentsPage() {
  return (
    <ToolsPrinterOperationPage>
      {(printer) => <ToolsTestDocumentsPanel printer={printer} />}
    </ToolsPrinterOperationPage>
  );
}
