"use client";

import { ToolsPrinterOperationPage } from "@/components/tools/tools-printer-operation-page";
import { ToolsWifiPanel } from "@/components/tools/tools-wifi-panel";

export default function ToolsPrinterWifiPage() {
  return (
    <ToolsPrinterOperationPage>
      {(printer) => <ToolsWifiPanel printer={printer} />}
    </ToolsPrinterOperationPage>
  );
}
