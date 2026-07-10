"use client";

import { ToolsPage } from "@/components/tools/tools-ui";
import { ToolsPrinterMacGuard } from "@/components/tools/tools-printer-sub-page";
import { ToolsReprintSection } from "@/components/tools/tools-reprint-section";
import type { ToolsPrinter } from "@/modules/tools/shared/types";

type ToolsReprintPanelProps = {
  printer: ToolsPrinter;
};

export function ToolsReprintPanel({ printer }: ToolsReprintPanelProps) {
  return (
    <ToolsPrinterMacGuard macAddress={printer.macAddress}>
      <ToolsPage>
        <ToolsReprintSection printer={printer} />
      </ToolsPage>
    </ToolsPrinterMacGuard>
  );
}
