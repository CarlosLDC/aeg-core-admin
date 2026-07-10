"use client";

import { ToolsHeaderPanel } from "@/components/tools/tools-header-panel";
import { ToolsPrinterOperationPage } from "@/components/tools/tools-printer-operation-page";

export default function ToolsPrinterHeaderPage() {
  return (
    <ToolsPrinterOperationPage>
      {(printer) => <ToolsHeaderPanel printer={printer} />}
    </ToolsPrinterOperationPage>
  );
}
