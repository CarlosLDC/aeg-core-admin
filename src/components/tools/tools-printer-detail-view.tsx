"use client";

import Link from "next/link";
import { AlertTriangle, ArrowLeft, Building2, LayoutGrid } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { pageToolbarButtonClass } from "@/components/ui/page-toolbar";
import { ResourceViewShell } from "@/components/resource-view/resource-view-shell";
import {
  ToolsMacWarning,
  ToolsMetricCard,
  ToolsNavCard,
  ToolsPage,
  ToolsPanelSection,
  ToolsSectionGrid,
  ToolsSectionHeading,
} from "@/components/tools/tools-ui";
import { ToolsPrinterStatusBar } from "@/components/tools/tools-printer-status-bar";
import { ToolsReprintPanel } from "@/components/tools/tools-reprint-panel";
import { ToolsTestDocumentsPanel } from "@/components/tools/tools-test-documents-panel";
import { useToolsPrinters } from "@/modules/tools/printers/use-tools-printers";
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
  const summary = TOOLS_SECTIONS.summary;

  return (
    <ResourceViewShell backHref={toolsListPath} backLabel="Volver al listado">
      <ToolsPage>
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

        <section className="space-y-3">
          <ToolsSectionHeading
            icon={summary.icon}
            tone={summary.tone}
            title={summary.title}
            description={summary.description}
          />
          <ToolsSectionGrid>
            <ToolsMetricCard label="Estado" value={printer.estado} />
            <ToolsMetricCard
              label="MAC"
              value={printer.macAddress ?? "Sin MAC"}
              mono
            />
            <ToolsMetricCard label="Firmware" value={printer.firmware} mono />
            <ToolsMetricCard label="Ubicación" value={printer.ubicacion} />
            <ToolsMetricCard label="Ciudad" value={printer.ciudad || "—"} />
            <ToolsMetricCard
              label="Cliente"
              value={printer.rifName || printer.rifCliente || "—"}
            />
          </ToolsSectionGrid>
        </section>

        {client ? (
          <ToolsPanelSection
            title="Información del cliente"
            icon={Building2}
            tone="slate"
          >
            <ToolsSectionGrid>
              <ToolsMetricCard label="Nombre" value={client.name} />
              <ToolsMetricCard label="Teléfono" value={client.phone} />
              <ToolsMetricCard label="Email" value={client.email} />
            </ToolsSectionGrid>
          </ToolsPanelSection>
        ) : null}

        <section className="space-y-3">
          <ToolsSectionHeading
            icon={LayoutGrid}
            tone="indigo"
            title="Operaciones"
            description="Acceda a las herramientas MQTT disponibles para esta impresora."
          />
          <ToolsSectionGrid>
            {TOOLS_PRINTER_NAV_SECTIONS.map((sectionKey) => {
              const section = TOOLS_SECTIONS[sectionKey];
              return (
                <ToolsNavCard
                  key={section.id}
                  href={toolsPrinterSectionHref(printer.serial, sectionKey)}
                  icon={section.icon}
                  tone={section.tone}
                  title={section.title}
                  description={section.description}
                />
              );
            })}
          </ToolsSectionGrid>
        </section>

        {printer.macAddress ? (
          <div className="space-y-4">
            <ToolsTestDocumentsPanel printer={printer} />
            <ToolsReprintPanel printer={printer} />
          </div>
        ) : null}
      </ToolsPage>
    </ResourceViewShell>
  );
}
