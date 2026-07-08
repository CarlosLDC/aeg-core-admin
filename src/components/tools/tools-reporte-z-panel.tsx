"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
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
import { useToast } from "@/context/toast-provider";

export function ToolsReporteZPanel({ printer }: { printer: ToolsPrinter }) {
  const toast = useToast();
  const [reportNumber, setReportNumber] = useState("");
  const [reportJson, setReportJson] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  const showReport = (report: Record<string, unknown> | undefined) => {
    if (report) {
      setReportJson(JSON.stringify(report, null, 2));
    }
  };

  const run = async (action: "list" | "generate" | "get" | "transmit" | "reprint") => {
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
        <section className="rounded-xl border bg-card p-4">
          <h3 className="font-medium">Reportes Z</h3>
          <label className="mt-4 block text-sm">
            <span className="text-muted">Número de reporte (opcional)</span>
            <input
              type="number"
              value={reportNumber}
              onChange={(e) => setReportNumber(e.target.value)}
              className="mt-1 w-full max-w-xs rounded-lg border bg-background px-3 py-2"
            />
          </label>
          <div className="mt-4 flex flex-wrap gap-2">
            {(["list", "generate", "get", "transmit", "reprint"] as const).map((action) => (
              <button
                key={action}
                type="button"
                disabled={loading != null}
                onClick={() => void run(action)}
                className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-foreground/[0.03] disabled:opacity-50"
              >
                {loading === action ? <Loader2 className="size-4 animate-spin" /> : null}
                {action === "list" && "Consultar último Z"}
                {action === "generate" && "Generar Z"}
                {action === "get" && "Obtener Z específico"}
                {action === "transmit" && "Transmitir a SENIAT"}
                {action === "reprint" && "Reimprimir Z"}
              </button>
            ))}
          </div>
        </section>

        {reportJson ? (
          <section className="rounded-xl border bg-card p-4">
            <h3 className="font-medium">Datos del reporte</h3>
            <pre className="mt-3 max-h-96 overflow-auto rounded-lg bg-foreground/[0.03] p-3 text-xs">
              {reportJson}
            </pre>
          </section>
        ) : null}
      </div>
    </ToolsPrinterMacGuard>
  );
}
