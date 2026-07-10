"use client";

import Link from "next/link";
import { AlertTriangle, ArrowLeft, LayoutGrid } from "lucide-react";
import { useEffect } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { pageToolbarButtonClass } from "@/components/ui/page-toolbar";
import { ResourceViewShell } from "@/components/resource-view/resource-view-shell";
import { ToolsConnectionModeSwitch } from "@/components/tools/tools-connection-mode-switch";
import {
  ToolsConnectionWarning,
  ToolsMacWarning,
  ToolsNavCard,
  ToolsPage,
  ToolsSectionGrid,
  ToolsSectionHeading,
  toolsSubsectionClass,
} from "@/components/tools/tools-ui";
import { ToolsPrinterStatusBar } from "@/components/tools/tools-printer-status-bar";
import { ToolsPrinterTransportShell } from "@/components/tools/tools-printer-transport-shell";
import { ToolsReporteZSection } from "@/components/tools/tools-reporte-z-section";
import { ToolsReprintSection } from "@/components/tools/tools-reprint-section";
import { ToolsTestDocumentsSection } from "@/components/tools/tools-test-documents-section";
import { ToolsUsbConnectPanel } from "@/components/tools/tools-usb-connect-panel";
import { useToolsPrinters } from "@/modules/tools/printers/use-tools-printers";
import { useToolsPrinterConnection } from "@/modules/tools/mqtt/use-tools-mqtt";
import { useToolsTransportContext } from "@/modules/tools/transport/tools-transport-provider";
import {
  TOOLS_PRINTER_NAV_SECTIONS,
  TOOLS_SECTIONS,
  toolsPrinterSectionHref,
} from "@/lib/tools-sections";
import { toolsListPath } from "@/lib/resource-routes";
import { cn } from "@/lib/utils";

type ToolsPrinterDetailViewProps = {
  serial: string;
};

function ToolsPrinterDetailContent({ serial }: ToolsPrinterDetailViewProps) {
  const { loading, error, reload, findBySerial } = useToolsPrinters();
  const printer = findBySerial(serial);
  const connection = useToolsPrinterConnection(
    printer?.id ?? null,
    printer?.macAddress ?? null,
  );
  const { macRequired } = useToolsTransportContext();

  useEffect(() => {
    if (connection.transportReady) {
      void connection.refreshStatus();
    }
  }, [connection.transportReady, connection.refreshStatus]);

  const remoteActionsDisabled = !connection.remoteActionsEnabled;
  const showMacWarning = macRequired && !printer?.macAddress;

  if (!printer) {
    return null;
  }

  return (
    <ToolsPage>
      <ToolsConnectionModeSwitch />

      {showMacWarning ? (
        <ToolsMacWarning>
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <p>
            Esta impresora no tiene dirección MAC registrada. Las operaciones remotas
            por WiFi requieren MAC en el catálogo. Puede usar conexión USB.
          </p>
        </ToolsMacWarning>
      ) : null}

      <ToolsUsbConnectPanel />

      {connection.transportReady ? <ToolsPrinterStatusBar connection={connection} /> : null}

      {connection.transportReady &&
      connection.connectionResolved &&
      connection.connectionIssue !== "none" ? (
        <ToolsConnectionWarning variant={connection.connectionIssue} />
      ) : null}

      <section className={toolsSubsectionClass}>
        <ToolsSectionHeading
          icon={LayoutGrid}
          tone="indigo"
          title="Operaciones"
          description="Acceda a las herramientas disponibles para esta impresora."
        />
        <ToolsSectionGrid>
          {TOOLS_PRINTER_NAV_SECTIONS.map((sectionKey) => {
            const section = TOOLS_SECTIONS[sectionKey];
            const requiresConnection = sectionKey !== "summary";
            return (
              <ToolsNavCard
                key={section.id}
                href={toolsPrinterSectionHref(printer.serial, sectionKey)}
                icon={section.icon}
                tone={section.tone}
                title={section.title}
                description={section.description}
                disabled={requiresConnection && remoteActionsDisabled}
              />
            );
          })}
        </ToolsSectionGrid>
      </section>

      {!remoteActionsDisabled ? (
        <>
          <ToolsReporteZSection
            printer={printer}
            remoteActionsDisabled={remoteActionsDisabled}
            seniatActionsDisabled={connection.seniatActionsDisabled}
          />
          <ToolsTestDocumentsSection
            printer={printer}
            remoteActionsDisabled={remoteActionsDisabled}
          />
          <ToolsReprintSection
            printer={printer}
            remoteActionsDisabled={remoteActionsDisabled}
          />
        </>
      ) : null}
    </ToolsPage>
  );
}

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
      <ResourceViewShell backHref={toolsListPath} backLabel="Volver al listado">
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
      </ResourceViewShell>
    );
  }

  return (
    <ResourceViewShell backHref={toolsListPath} backLabel="Volver al listado">
      <ToolsPrinterTransportShell printer={printer}>
        <ToolsPrinterDetailContent serial={serial} />
      </ToolsPrinterTransportShell>
    </ResourceViewShell>
  );
}
