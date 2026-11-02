"use client";

import type { ReactNode } from "react";
import { useParams } from "next/navigation";
import { useToolsPrinters } from "@/modules/tools/printers/use-tools-printers";
import { ToolsTransportProvider } from "@/modules/tools/transport/tools-transport-provider";

export default function ToolsPrinterSerialLayout({
  children,
}: {
  children: ReactNode;
}) {
  const params = useParams<{ serial?: string }>();
  const serial =
    typeof params?.serial === "string" ? decodeURIComponent(params.serial) : "";
  const { findBySerial } = useToolsPrinters();
  const printer = serial ? findBySerial(serial) : null;

  return (
    <ToolsTransportProvider
      printerSerial={printer?.serial ?? serial}
      printerId={printer?.id ?? null}
      macAddress={printer?.macAddress ?? null}
    >
      {children}
    </ToolsTransportProvider>
  );
}
