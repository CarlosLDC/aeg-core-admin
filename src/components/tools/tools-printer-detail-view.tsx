"use client";

import Link from "next/link";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { pageToolbarButtonClass } from "@/components/ui/page-toolbar";
import {
  DetailField,
  DetailSection,
} from "@/components/resource-view/detail-fields";
import { ResourceViewShell } from "@/components/resource-view/resource-view-shell";
import { ToolsNavLink, ToolsMacWarning } from "@/components/tools/tools-ui";
import { ToolsPrinterStatusBar } from "@/components/tools/tools-printer-status-bar";
import { ToolsReprintPanel } from "@/components/tools/tools-reprint-panel";
import { ToolsTestDocumentsPanel } from "@/components/tools/tools-test-documents-panel";
import { useToolsPrinters } from "@/modules/tools/printers/use-tools-printers";
import {
  toolsListPath,
  toolsPrinterFormasPagoPath,
  toolsPrinterReporteZPath,
  toolsPrinterWifiPath,
} from "@/lib/resource-routes";
import { cn } from "@/lib/utils";

type ToolsPrinterDetailViewProps = {
  serial: string;
};

export function ToolsPrinterDetailView({ serial }: ToolsPrinterDetailViewProps) {
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
        description={`No se encontró la impresora con serial ${serial} en tu alcance operativo.`}
        action={
          <Link
            href={toolsListPath}
            className={cn(
              pageToolbarButtonClass,
              "border border-border bg-card hover:bg-foreground/[0.03]",
            )}
          >
            <ArrowLeft className="size-4" aria-hidden />
            Volver a Tools
          </Link>
        }
      />
    );
  }

  const client = printer.clientSummary;

  return (
    <ResourceViewShell backHref={toolsListPath} backLabel="Volver al listado">
      {!printer.macAddress ? (
        <ToolsMacWarning>
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <p>
            Esta impresora no tiene dirección MAC registrada. Las operaciones MQTT
            requieren MAC en el catálogo.
          </p>
        </ToolsMacWarning>
      ) : null}

      <ToolsPrinterStatusBar
        printerId={printer.id}
        macAddress={printer.macAddress}
      />

      <DetailSection title="Resumen" layout="quad">
        <DetailField label="Estado" value={printer.estado} />
        <DetailField label="MAC" value={printer.macAddress ?? "Sin MAC"} mono />
        <DetailField label="Firmware" value={printer.firmware} />
        <DetailField label="Ubicación" value={printer.ubicacion} />
      </DetailSection>

      {client ? (
        <DetailSection title="Información del cliente">
          <DetailField label="Nombre" value={client.name} />
          <DetailField label="Teléfono" value={client.phone} />
          <DetailField label="Email" value={client.email} />
        </DetailSection>
      ) : null}

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-card-foreground">Operaciones</h3>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <ToolsNavLink
            title="Configurar WiFi"
            description="Escanear redes y conectar la impresora."
            href={toolsPrinterWifiPath(printer.serial)}
          />
          <ToolsNavLink
            title="Reporte Z / Cierre"
            description="Generar, transmitir y reimprimir reportes Z."
            href={toolsPrinterReporteZPath(printer.serial)}
          />
          <ToolsNavLink
            title="Formas de pago"
            description="Consultar y editar descripciones de pago."
            href={toolsPrinterFormasPagoPath(printer.serial)}
          />
        </div>
      </section>

      {printer.macAddress ? (
        <>
          <ToolsTestDocumentsPanel printer={printer} />
          <ToolsReprintPanel printer={printer} />
        </>
      ) : null}
    </ResourceViewShell>
  );
}
