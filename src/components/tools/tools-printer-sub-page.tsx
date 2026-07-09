"use client";

import { useParams } from "next/navigation";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { ResourceViewShell } from "@/components/resource-view/resource-view-shell";
import { useToolsPrinters } from "@/modules/tools/printers/use-tools-printers";
import type { ToolsPrinter } from "@/modules/tools/shared/types";
import { toolsPrinterPath } from "@/lib/resource-routes";

type ToolsPrinterSubPageProps = {
  children: (printer: ToolsPrinter) => React.ReactNode;
};

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
    <ResourceViewShell
      backHref={toolsPrinterPath(printer.serial)}
      backLabel="Volver al detalle"
    >
      {children(printer)}
    </ResourceViewShell>
  );
}

export function ToolsPrinterMacGuard({
  macAddress,
  children,
}: {
  macAddress: string | null;
  children: React.ReactNode;
}) {
  if (!macAddress) {
    return (
      <EmptyState
        compact
        title="MAC requerida"
        description="Registre la dirección MAC de la impresora en el catálogo antes de usar operaciones MQTT."
      />
    );
  }
  return <>{children}</>;
}
