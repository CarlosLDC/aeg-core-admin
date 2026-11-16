"use client";

import { PrinterLogsSection } from "@/components/printers/printer-logs-section";
import { ToolsPrinterOperationPage } from "@/components/tools/tools-printer-operation-page";

export default function ToolsPrinterLogsPage() {
  return (
    <ToolsPrinterOperationPage allow={["ADMIN"]}>
      {(printer) => <PrinterLogsSection printer={printer} />}
    </ToolsPrinterOperationPage>
  );
}
