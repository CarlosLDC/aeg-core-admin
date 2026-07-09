"use client";

import Link from "next/link";
import { AlertTriangle, ArrowLeft, Building2, LayoutGrid, Truck } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { pageToolbarButtonClass } from "@/components/ui/page-toolbar";
import { DetailField } from "@/components/resource-view/detail-fields";
import { ResourceViewShell } from "@/components/resource-view/resource-view-shell";
import {
  ToolsDetailFields,
  ToolsMacWarning,
  ToolsNavCard,
  ToolsPage,
  ToolsPanelSection,
  ToolsSectionGrid,
  ToolsSectionHeading,
} from "@/components/tools/tools-ui";
import { ToolsPrinterStatusBar } from "@/components/tools/tools-printer-status-bar";
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
  const { loading, error, reload, findBySerial, role } = useToolsPrinters();
  const printer = findBySerial(serial);
  const isAdmin = role === "ADMIN";

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
  const hasDistributorInfo =
    Boolean(printer.distributorName.trim()) ||
    Boolean(printer.distributorRif.trim());
  const showPartySection = Boolean(client) || (isAdmin && hasDistributorInfo);

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

        <ToolsPanelSection
          title={summary.title}
          description={summary.description}
          icon={summary.icon}
          tone={summary.tone}
        >
          <ToolsDetailFields>
            <DetailField label="Estado" value={printer.estado} />
            <DetailField
              label="MAC"
              value={printer.macAddress ?? "Sin MAC"}
              mono
            />
            <DetailField label="Firmware" value={printer.firmware} mono />
            <DetailField label="Ciudad" value={printer.ciudad || "—"} />
            <DetailField
              label="Ubicación"
              value={printer.ubicacion || "—"}
              fullWidth
            />
          </ToolsDetailFields>
        </ToolsPanelSection>

        {showPartySection ? (
          <ToolsPanelSection
            title="Información del cliente"
            icon={Building2}
            tone="slate"
          >
          <div className="space-y-4">
            {client ? (
              <ToolsDetailFields>
                <DetailField label="Nombre" value={client.name} />
                <DetailField label="RIF" value={printer.rifCliente || "—"} mono />
                <DetailField label="Teléfono" value={client.phone} />
                <DetailField label="Email" value={client.email} />
              </ToolsDetailFields>
            ) : null}
            {isAdmin && hasDistributorInfo ? (
              <div className={client ? "border-t border-border pt-4" : undefined}>
                <div className="mb-3 flex items-center gap-2">
                  <Truck className="size-4 shrink-0 text-muted" aria-hidden />
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                    Distribuidor
                  </p>
                </div>
                <ToolsDetailFields>
                  <DetailField
                    label="Nombre"
                    value={printer.distributorName || "—"}
                  />
                  <DetailField
                    label="RIF"
                    value={printer.distributorRif || "—"}
                    mono
                  />
                </ToolsDetailFields>
              </div>
            ) : null}
          </div>
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
      </ToolsPage>
    </ResourceViewShell>
  );
}
