"use client";

import { ToolsPrinterOperationPage } from "@/components/tools/tools-printer-operation-page";
import { BrokerMigrationPanel } from "@/modules/tools/broker-migration/BrokerMigrationPanel";

export default function BrokerMigrationPage() {
  return (
    <ToolsPrinterOperationPage>
      {(printer) => <BrokerMigrationPanel printer={printer} />}
    </ToolsPrinterOperationPage>
  );
}
