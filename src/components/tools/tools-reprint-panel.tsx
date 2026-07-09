"use client";

import { useState } from "react";
import { BarChart3, Eye, Printer, X } from "lucide-react";
import { FieldLabel } from "@/components/ui/field-label";
import {
  ToolsActionTile,
  ToolsPage,
  ToolsPanelActions,
  ToolsPanelSection,
  ToolsSectionHeading,
  toolsPanelSectionClass,
} from "@/components/tools/tools-ui";
import { ToolsPrinterMacGuard } from "@/components/tools/tools-printer-sub-page";
import { escPosToHtml } from "@/modules/tools/escpos/esc-pos-to-html";
import type { ToolsPrinter } from "@/modules/tools/shared/types";
import {
  getToolsMqttErrorMessage,
  reprintToolsDocument,
  sendToolsReportX,
} from "@/lib/tools-mqtt-api";
import { TOOLS_SECTIONS } from "@/lib/tools-sections";
import {
  formFieldInputClass,
  formFieldNativeSelectClass,
} from "@/lib/toggle-button-styles";
import { useToast } from "@/context/toast-provider";
import { cn } from "@/lib/utils";

type ToolsReprintPanelProps = {
  printer: ToolsPrinter;
};

export function ToolsReprintPanel({ printer }: ToolsReprintPanelProps) {
  const toast = useToast();
  const section = TOOLS_SECTIONS.reprint;
  const [docType, setDocType] = useState("FAC");
  const [number, setNumber] = useState("");
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  const runReprint = async (mode: "visualize" | "reprint") => {
    const n = Number(number);
    if (!Number.isFinite(n) || n <= 0) {
      toast.error("Indique un número de documento válido.");
      return;
    }
    setLoading(mode);
    try {
      const result = await reprintToolsDocument(printer.id, {
        docType,
        number: n,
        mode,
      });
      if (mode === "visualize" && result.escPosContent) {
        setPreviewHtml(escPosToHtml(result.escPosContent));
      } else {
        toast.success(result.message ?? "Comando enviado a la impresora.");
      }
    } catch (err) {
      toast.error(getToolsMqttErrorMessage(err));
    } finally {
      setLoading(null);
    }
  };

  const runReportX = async () => {
    setLoading("report-x");
    try {
      const result = await sendToolsReportX(printer.id);
      toast.success(result.message ?? "Reporte X enviado.");
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

        <ToolsPanelSection
          title="Documento fiscal"
          description="Seleccione el tipo y número del documento a consultar o reimprimir."
          icon={section.icon}
          tone={section.tone}
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block">
              <FieldLabel className="text-muted">Tipo</FieldLabel>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                className={formFieldNativeSelectClass}
              >
                <option value="FAC">Factura</option>
                <option value="NC">Nota de crédito</option>
                <option value="ND">Nota de débito</option>
                <option value="NF">No fiscal (NF)</option>
                <option value="RX">Reporte X (RX)</option>
              </select>
            </label>
            <label className="block sm:col-span-2">
              <FieldLabel className="text-muted">Número</FieldLabel>
              <input
                type="number"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                className={formFieldInputClass}
              />
            </label>
          </div>
          <ToolsPanelActions className="mt-4">
            <ToolsActionTile
              label="Visualizar"
              icon={Eye}
              tone="indigo"
              loading={loading === "visualize"}
              disabled={loading != null}
              onClick={() => void runReprint("visualize")}
            />
            <ToolsActionTile
              label="Reimprimir"
              icon={Printer}
              tone="indigo"
              variant="primary"
              loading={loading === "reprint"}
              disabled={loading != null}
              onClick={() => void runReprint("reprint")}
            />
            <ToolsActionTile
              label="Generar reporte X"
              icon={BarChart3}
              tone="indigo"
              loading={loading === "report-x"}
              disabled={loading != null}
              onClick={() => void runReportX()}
            />
          </ToolsPanelActions>
        </ToolsPanelSection>

        {previewHtml ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div
              className={cn(
                toolsPanelSectionClass,
                "max-h-[90vh] w-full max-w-2xl overflow-hidden p-0",
              )}
            >
              <div className="flex items-center justify-between border-b border-border px-5 py-3">
                <h3 className="text-sm font-semibold text-card-foreground">
                  Vista previa del documento
                </h3>
                <button
                  type="button"
                  onClick={() => setPreviewHtml(null)}
                  aria-label="Cerrar"
                  className="rounded-lg p-1 text-muted transition-colors hover:bg-foreground/[0.03] hover:text-foreground"
                >
                  <X className="size-5" />
                </button>
              </div>
              <div
                className="max-h-[70vh] overflow-auto p-5 font-mono text-xs"
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            </div>
          </div>
        ) : null}
      </ToolsPage>
    </ToolsPrinterMacGuard>
  );
}
