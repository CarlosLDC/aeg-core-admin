"use client";

import { Building2, Truck } from "lucide-react";
import { DetailField } from "@/components/resource-view/detail-fields";
import {
  ToolsDetailFields,
  ToolsIconBadge,
  ToolsPage,
  ToolsPartyInfoFields,
  ToolsSectionHeading,
  toolsPanelSectionClass,
} from "@/components/tools/tools-ui";
import { ToolsPrinterStatusBadge } from "@/components/tools/tools-printer-status-badge";
import { useToolsPrinters } from "@/modules/tools/printers/use-tools-printers";
import type { ToolsPrinter } from "@/modules/tools/shared/types";
import { TOOLS_SECTIONS } from "@/lib/tools-sections";
import { cn } from "@/lib/utils";

type ToolsPrinterSummaryPanelProps = {
  printer: ToolsPrinter;
};

function DividedSection({
  title,
  icon,
  tone = "slate",
  children,
  className,
}: {
  title: string;
  icon?: typeof Building2;
  tone?: (typeof TOOLS_SECTIONS)["summary"]["tone"];
  children: React.ReactNode;
  className?: string;
}) {
  const Icon = icon;

  return (
    <section className={cn("space-y-4", className)}>
      <div className="flex items-center gap-2.5">
        {Icon ? <ToolsIconBadge icon={Icon} tone={tone} size="sm" /> : null}
        <h3 className="text-sm font-semibold text-card-foreground">{title}</h3>
      </div>
      {children}
    </section>
  );
}

export function ToolsPrinterSummaryPanel({
  printer,
}: ToolsPrinterSummaryPanelProps) {
  const { role } = useToolsPrinters();
  const section = TOOLS_SECTIONS.summary;
  const client = printer.clientSummary;
  const distributor = printer.distributorSummary;
  const isAdmin = role === "ADMIN";

  return (
    <ToolsPage>
      <ToolsSectionHeading
        icon={section.icon}
        tone={section.tone}
        title={section.title}
        description={section.description}
      />

      <section className={cn(toolsPanelSectionClass, "space-y-6")}>
        <DividedSection title="Datos de la impresora">
            <ToolsDetailFields>
              <DetailField
                label="Serial"
                value={printer.serial}
                mono
              />
              <DetailField
                label="Modelo"
                value={`${printer.marca} ${printer.modelo}`.trim() || "—"}
              />
              <DetailField
                label="Estatus"
                value={
                  <ToolsPrinterStatusBadge
                    status={printer.status}
                    label={printer.estado}
                  />
                }
                fullWidth
              />
              <DetailField
                label="MAC"
                value={printer.macAddress ?? "Sin MAC"}
                mono
              />
              <DetailField label="Firmware" value={printer.firmware} mono />
              <DetailField label="Estado" value={printer.ubicacion || "—"} />
              <DetailField label="Ciudad" value={printer.ciudad || "—"} />
            </ToolsDetailFields>
          </DividedSection>

          {client ? (
            <>
              <div className="border-t border-border" aria-hidden />
              <DividedSection
                title="Información del cliente"
                icon={Building2}
                tone="slate"
              >
                <ToolsPartyInfoFields party={client} />
              </DividedSection>
            </>
          ) : null}

          {isAdmin && distributor ? (
            <>
              <div className="border-t border-border" aria-hidden />
              <DividedSection
                title="Información del distribuidor"
                icon={Truck}
                tone="slate"
              >
                <ToolsPartyInfoFields party={distributor} />
              </DividedSection>
            </>
          ) : null}
      </section>
    </ToolsPage>
  );
}
