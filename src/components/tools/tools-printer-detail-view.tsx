"use client";

import Link from "next/link";
import { AlertTriangle, ArrowLeft, LayoutGrid } from "lucide-react";
import { useEffect } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { pageToolbarButtonClass } from "@/components/ui/page-toolbar";
import { ResourceViewShell } from "@/components/resource-view/resource-view-shell";
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
import { ToolsReporteZSection } from "@/components/tools/tools-reporte-z-section";
import { ToolsReprintSection } from "@/components/tools/tools-reprint-section";
import { ToolsTestDocumentsSection } from "@/components/tools/tools-test-documents-section";
import { useToolsPrinters } from "@/modules/tools/printers/use-tools-printers";
import { useToolsPrinterConnection } from "@/modules/tools/mqtt/use-tools-mqtt";
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

export function ToolsPrinterDetailView({ serial }: ToolsPrinterDetailViewProps) {
  const { loading, error, reload, findBySerial } = useToolsPrinters();
  const printer = findBySerial(serial);
  const connection = useToolsPrinterConnection(
    printer?.id ?? null,
    printer?.macAddress ?? null,
  );

  useEffect(() => {
    if (connection.mqttReady) {
      void connection.refreshStatus();
    }
  }, [connection.mqttReady, connection.refreshStatus]);

  const remoteActionsDisabled = Boolean(
    printer?.macAddress && connection.connectionKnown && !connection.isOnline,
  );

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

  return (
    <ResourceViewShell backHref={toolsListPath} backLabel="Volver al listado">
      <ToolsPage>
        {!printer.macAddress ? (
          <ToolsMacWarning>
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
            <p>
              Esta impresora no tiene dirección MAC registrada. Las operaciones remotas
              requieren MAC en el catálogo.
            </p>
          </ToolsMacWarning>
        ) : null}

        <ToolsPrinterStatusBar connection={connection} />

        {remoteActionsDisabled ? <ToolsConnectionWarning /> : null}

        <section className={toolsSubsectionClass}>
          <ToolsSectionHeading
            icon={LayoutGrid}
            tone="indigo"
            title="Operaciones"
            description="Acceda a las herramientas remotas disponibles para esta impresora."
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
                  disabled={
                    requiresConnection && remoteActionsDisabled
                  }
                />
              );
            })}
          </ToolsSectionGrid>
        </section>

        {printer.macAddress ? (
          <>
            <ToolsReporteZSection
              printer={printer}
              remoteActionsDisabled={remoteActionsDisabled}
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
    </ResourceViewShell>
  );
}
