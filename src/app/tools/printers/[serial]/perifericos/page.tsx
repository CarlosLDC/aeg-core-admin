"use client";

import { ToolsPeripheralsPanel } from "@/components/tools/tools-peripherals-panel";
import { ToolsPrinterOperationPage } from "@/components/tools/tools-printer-operation-page";

export default function ToolsPrinterPeripheralsPage() {
  return (
    <ToolsPrinterOperationPage allow={["ADMIN"]}>
      {(printer) => <ToolsPeripheralsPanel printer={printer} />}
    </ToolsPrinterOperationPage>
  );
}
