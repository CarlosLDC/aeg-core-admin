"use client";

import { useState } from "react";
import {
  AlignLeft,
  AlignRight,
  BarChart3,
  Eye,
  Printer,
  X,
} from "lucide-react";
import { FieldLabel } from "@/components/ui/field-label";
import {
  ToolsActionButton,
  ToolsActionTile,
  ToolsPage,
  ToolsPanelActions,
  ToolsPanelGrid,
  ToolsPanelSection,
  toolsPanelSectionClass,
} from "@/components/tools/tools-ui";
import { escPosToHtml } from "@/modules/tools/escpos/esc-pos-to-html";
import type { ToolsPrinter } from "@/modules/tools/shared/types";
import {
  getToolsMqttErrorMessage,
  readToolsFooter,
  readToolsHeader,
  reprintToolsDocument,
  sendToolsReportX,
  writeToolsFooter,
  writeToolsHeader,
} from "@/lib/tools-mqtt-api";
import { TOOLS_SECTIONS } from "@/lib/tools-sections";
import {
  formFieldInputClass,
  formFieldNativeSelectClass,
  formFieldTextareaClass,
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
  const [headerContent, setHeaderContent] = useState("");
  const [footerContent, setFooterContent] = useState("");
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  if (!printer.macAddress) {
    return null;
  }

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

  const runHeaderFooter = async (
    kind: "header-read" | "header-write" | "footer-read" | "footer-write",
  ) => {
    setLoading(kind);
    try {
      if (kind === "header-read") {
        const result = await readToolsHeader(printer.id);
        setHeaderContent(result.content ?? "");
        toast.success("Encabezado leído.");
      } else if (kind === "footer-read") {
        const result = await readToolsFooter(printer.id);
        setFooterContent(result.content ?? "");
        toast.success("Pie de página leído.");
      } else if (kind === "header-write") {
        const result = await writeToolsHeader(printer.id, headerContent);
        toast.success(result.message ?? "Encabezado actualizado.");
      } else {
        const result = await writeToolsFooter(printer.id, footerContent);
        toast.success(result.message ?? "Pie actualizado.");
      }
    } catch (err) {
      toast.error(getToolsMqttErrorMessage(err));
    } finally {
      setLoading(null);
    }
  };

  return (
    <ToolsPage>
      <ToolsPanelSection
        title={section.title}
        description={section.description}
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

      <ToolsPanelGrid className="xl:grid-cols-2">
        <ToolsPanelSection
          title="Encabezado fiscal"
          icon={AlignLeft}
          tone="indigo"
        >
          <textarea
            value={headerContent}
            onChange={(e) => setHeaderContent(e.target.value)}
            rows={4}
            className={formFieldTextareaClass}
          />
          <ToolsPanelActions className="mt-3">
            <ToolsActionButton
              loading={loading === "header-read"}
              disabled={loading != null}
              onClick={() => void runHeaderFooter("header-read")}
            >
              Leer
            </ToolsActionButton>
            <ToolsActionButton
              variant="primary"
              loading={loading === "header-write"}
              disabled={loading != null}
              onClick={() => void runHeaderFooter("header-write")}
            >
              Guardar
            </ToolsActionButton>
          </ToolsPanelActions>
        </ToolsPanelSection>

        <ToolsPanelSection title="Pie de página" icon={AlignRight} tone="indigo">
          <textarea
            value={footerContent}
            onChange={(e) => setFooterContent(e.target.value)}
            rows={4}
            className={formFieldTextareaClass}
          />
          <ToolsPanelActions className="mt-3">
            <ToolsActionButton
              loading={loading === "footer-read"}
              disabled={loading != null}
              onClick={() => void runHeaderFooter("footer-read")}
            >
              Leer
            </ToolsActionButton>
            <ToolsActionButton
              variant="primary"
              loading={loading === "footer-write"}
              disabled={loading != null}
              onClick={() => void runHeaderFooter("footer-write")}
            >
              Guardar
            </ToolsActionButton>
          </ToolsPanelActions>
        </ToolsPanelSection>
      </ToolsPanelGrid>

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
  );
}
