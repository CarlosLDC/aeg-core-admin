"use client";

import { ToolsPrinterOperationPage } from "@/components/tools/tools-printer-operation-page";
import { ToolsFormasPagoPanel } from "@/components/tools/tools-formas-pago-panel";

export default function ToolsPrinterFormasPagoPage() {
  return (
    <ToolsPrinterOperationPage>
      {(printer) => <ToolsFormasPagoPanel printer={printer} />}
    </ToolsPrinterOperationPage>
  );
}
