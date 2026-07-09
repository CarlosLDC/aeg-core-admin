"use client";

import { ToolsPrinterOperationPage } from "@/components/tools/tools-printer-operation-page";
import { ToolsReprintPanel } from "@/components/tools/tools-reprint-panel";

export default function ToolsPrinterReprintPage() {
  return (
    <ToolsPrinterOperationPage>
      {(printer) => <ToolsReprintPanel printer={printer} />}
    </ToolsPrinterOperationPage>
  );
}
