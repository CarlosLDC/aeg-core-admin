"use client";

import { ToolsPrinterOperationPage } from "@/components/tools/tools-printer-operation-page";
import { ToolsTicketCustomizationPanel } from "@/components/tools/tools-ticket-customization-panel";

export default function ToolsPrinterTicketCustomizationPage() {
  return (
    <ToolsPrinterOperationPage allow={["ADMIN"]}>
      {(printer) => <ToolsTicketCustomizationPanel printer={printer} />}
    </ToolsPrinterOperationPage>
  );
}
