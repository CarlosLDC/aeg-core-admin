"use client";

import type { ReactNode } from "react";
import type { ToolsPrinter } from "@/modules/tools/shared/types";
import {
  ToolsTransportProvider,
  useOptionalToolsTransportContext,
} from "@/modules/tools/transport/tools-transport-provider";

type ToolsPrinterTransportShellProps = {
  printer: ToolsPrinter;
  children: ReactNode;
};

export function ToolsPrinterTransportShell({
  printer,
  children,
}: ToolsPrinterTransportShellProps) {
  const existingContext = useOptionalToolsTransportContext();
  if (existingContext != null) {
    return <>{children}</>;
  }

  return (
    <ToolsTransportProvider
      printerSerial={printer.serial}
      printerId={printer.id}
      macAddress={printer.macAddress}
    >
      {children}
    </ToolsTransportProvider>
  );
}
