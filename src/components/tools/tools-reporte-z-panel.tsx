"use client";

import { useState } from "react";
import { FieldLabel } from "@/components/ui/field-label";
import {
  ToolsActionButton,
  ToolsPanelActions,
  ToolsPanelSection,
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
import { formFieldInputClass } from "@/lib/toggle-button-styles";
import { useToast } from "@/context/toast-provider";

const REPORT_ACTIONS = [
  ["list", "Consultar último Z"],
  ["generate", "Generar Z"],
  ["get", "Obtener Z específico"],
  ["transmit", "Transmitir a SENIAT"],
  ["reprint", "Reimprimir Z"],
] as const;

type ReportAction = (typeof REPORT_ACTIONS)[number][0];

export function ToolsReporteZPanel({ printer }: { printer: ToolsPrinter }) {
  const toast = useToast();
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
      <div className="space-y-4">
        <ToolsPanelSection title="Reportes Z">
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
          <ToolsPanelActions className="mt-4" hint="Los comandos se envían de inmediato a la impresora.">
            {REPORT_ACTIONS.map(([action, label]) => (
              <ToolsActionButton
                key={action}
                loading={loading === action}
                disabled={loading != null}
                variant={action === "generate" ? "primary" : "default"}
                onClick={() => void run(action)}
              >
                {label}
              </ToolsActionButton>
            ))}
          </ToolsPanelActions>
        </ToolsPanelSection>

        {reportJson ? (
          <ToolsPanelSection title="Datos del reporte">
            <pre className="max-h-96 overflow-auto rounded-lg border border-border bg-foreground/[0.03] p-3 text-xs">
              {reportJson}
            </pre>
          </ToolsPanelSection>
        ) : null}
      </div>
    </ToolsPrinterMacGuard>
  );
}
