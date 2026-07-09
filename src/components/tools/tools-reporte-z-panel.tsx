"use client";

import { useState } from "react";
import {
  FileSearch,
  Printer,
  ScrollText,
  Send,
} from "lucide-react";
import { FieldLabel } from "@/components/ui/field-label";
import {
  ToolsActionButton,
  ToolsPage,
  ToolsPanelSection,
  ToolsSectionHeading,
  toolsPanelSectionClass,
} from "@/components/tools/tools-ui";
import { ToolsPrinterMacGuard } from "@/components/tools/tools-printer-sub-page";
import type { ToolsPrinter } from "@/modules/tools/shared/types";
import {
  generateToolsReportZ,
  getToolsMqttErrorMessage,
  getToolsReportZ,
  listToolsReportZ,
  reprintToolsDocument,
  transmitToolsReportZ,
} from "@/lib/tools-mqtt-api";
import { TOOLS_SECTIONS } from "@/lib/tools-sections";
import { formFieldInputClass } from "@/lib/toggle-button-styles";
import { useToast } from "@/context/toast-provider";

const REPORT_ACTIONS = [
  ["list", "Consultar último Z", FileSearch],
  ["generate", "Generar Z", ScrollText],
  ["get", "Obtener Z específico", FileSearch],
  ["transmit", "Transmitir a SENIAT", Send],
  ["reprint", "Reimprimir Z", Printer],
] as const;

type ReportAction = (typeof REPORT_ACTIONS)[number][0];

export function ToolsReporteZPanel({ printer }: { printer: ToolsPrinter }) {
  const toast = useToast();
  const section = TOOLS_SECTIONS.reporteZ;
  const [reportNumber, setReportNumber] = useState("");
  const [reportJson, setReportJson] = useState<string | null>(null);
  const [loading, setLoading] = useState<ReportAction | null>(null);

  const showReport = (report: Record<string, unknown> | undefined) => {
    if (report) {
      setReportJson(JSON.stringify(report, null, 2));
    }
  };

  const run = async (action: ReportAction) => {
    setLoading(action);
    try {
      if (action === "list") {
        const result = await listToolsReportZ(printer.id);
        showReport(result.report?.report);
        toast.success("Último reporte Z consultado.");
      } else if (action === "generate") {
        const result = await generateToolsReportZ(printer.id);
        showReport(result.report?.report);
        toast.success("Reporte Z generado.");
      } else if (action === "get") {
        const n = Number(reportNumber);
        if (!Number.isFinite(n) || n <= 0) {
          toast.error("Indique un número de reporte Z válido.");
          return;
        }
        const result = await getToolsReportZ(printer.id, n);
        showReport(result.report?.report);
        toast.success(`Reporte Z #${n} obtenido.`);
      } else if (action === "transmit") {
        const result = await transmitToolsReportZ(printer.id);
        if (result.seniatUnavailable) {
          toast.error(result.message ?? "SENIAT no responde.");
        } else if (result.lastTransmittedZ != null) {
          toast.success(`Último Z transmitido: ${result.lastTransmittedZ}`);
        } else {
          toast.success(result.message ?? "Transmisión completada.");
        }
      } else {
        const n = Number(reportNumber);
        if (!Number.isFinite(n) || n <= 0) {
          toast.error("Indique un número de reporte Z para reimprimir.");
          return;
        }
        await reprintToolsDocument(printer.id, {
          docType: "Z",
          number: n,
          mode: "reprint",
        });
        toast.success(`Reimpresión Z #${n} enviada a la impresora.`);
      }
    } catch (err) {
      toast.error(getToolsMqttErrorMessage(err));
    } finally {
      setLoading(null);
    }
  };

  return (
    <ToolsPrinterMacGuard macAddress={printer.macAddress}>
      <ToolsPage>
        <ToolsSectionHeading
          icon={section.icon}
          tone={section.tone}
          title={section.title}
          description={section.description}
        />

        <div className={toolsPanelSectionClass}>
          <label className="block max-w-xs">
            <FieldLabel className="text-muted">
              Número de reporte (opcional)
            </FieldLabel>
            <input
              type="number"
              value={reportNumber}
              onChange={(e) => setReportNumber(e.target.value)}
              className={formFieldInputClass}
            />
          </label>
          <div className="mt-4 flex flex-wrap gap-2">
            {REPORT_ACTIONS.map(([action, label, Icon]) => (
              <ToolsActionButton
                key={action}
                variant={action === "generate" ? "primary" : "default"}
                loading={loading === action}
                disabled={loading != null}
                onClick={() => void run(action)}
              >
                <Icon className="size-4 shrink-0" aria-hidden />
                {label}
              </ToolsActionButton>
            ))}
          </div>
        </div>

        {reportJson ? (
          <ToolsPanelSection
            title="Datos del reporte"
            icon={ScrollText}
            tone="violet"
          >
            <pre className="max-h-96 overflow-auto rounded-lg border border-border bg-foreground/[0.03] p-3 text-xs">
              {reportJson}
            </pre>
          </ToolsPanelSection>
        ) : null}
      </ToolsPage>
    </ToolsPrinterMacGuard>
  );
}
