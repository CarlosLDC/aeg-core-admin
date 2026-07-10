"use client";

import { useParams } from "next/navigation";
import { ToolsUsbConnectPanel } from "@/components/tools/tools-usb-connect-panel";
import { ToolsPrinterTransportShell } from "@/components/tools/tools-printer-transport-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { ResourceViewShell } from "@/components/resource-view/resource-view-shell";
import { useToolsPrinters } from "@/modules/tools/printers/use-tools-printers";
import type { ToolsPrinter } from "@/modules/tools/shared/types";
import { useOptionalToolsTransportContext } from "@/modules/tools/transport/tools-transport-provider";
import { toolsPrinterPath } from "@/lib/resource-routes";

type ToolsPrinterSubPageProps = {
  children: (printer: ToolsPrinter) => React.ReactNode;
};

function ToolsPrinterSubPageContent({
  printer,
  children,
}: {
  printer: ToolsPrinter;
  children: (printer: ToolsPrinter) => React.ReactNode;
}) {
  return (
    <ResourceViewShell
      backHref={toolsPrinterPath(printer.serial)}
      backLabel="Volver al detalle"
    >
      <div className="mb-6">
        <ToolsUsbConnectPanel />
      </div>
      {children(printer)}
    </ResourceViewShell>
  );
}

export function ToolsPrinterSubPage({ children }: ToolsPrinterSubPageProps) {
  const params = useParams();
  const serial = typeof params.serial === "string" ? params.serial : "";
  const { loading, error, reload, findBySerial } = useToolsPrinters();
  const printer = findBySerial(serial);

  if (loading && !printer) {
    return (
      <ResourceViewShell loading>
        {null}
      </ResourceViewShell>
    );
  }

  if (error) {
    return (
      <ErrorState message={error} onRetry={() => void reload()} retrying={loading} />
    );
  }

  if (!printer) {
    return (
      <EmptyState
        title="Impresora no encontrada"
        description={`No se encontró la impresora con serial ${serial}.`}
      />
    );
  }

  return (
    <ToolsPrinterTransportShell printer={printer}>
      <ToolsPrinterSubPageContent printer={printer}>
        {children}
      </ToolsPrinterSubPageContent>
    </ToolsPrinterTransportShell>
  );
}

export function ToolsPrinterMacGuard({
  macAddress,
  children,
}: {
  macAddress: string | null;
  children: React.ReactNode;
}) {
  const transportContext = useOptionalToolsTransportContext();
  const usbMode = transportContext?.mode === "usb";
  const usbConnected = transportContext?.usbConnected === true;

  if (usbMode) {
    if (!usbConnected) {
      return (
        <EmptyState
          compact
          title="USB requerido"
          description="Conecte la impresora por USB antes de usar las operaciones."
        />
      );
    }
    return <>{children}</>;
  }

  if (!macAddress) {
    return (
      <EmptyState
        compact
        title="MAC requerida"
        description="Registre la dirección MAC de la impresora en el catálogo antes de usar las operaciones remotas, o cambie a conexión USB."
      />
    );
  }
  return <>{children}</>;
}
