"use client";

import { useState } from "react";
import { Loader2, X } from "lucide-react";
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
import { useToast } from "@/context/toast-provider";

type ToolsReprintPanelProps = {
  printer: ToolsPrinter;
};

export function ToolsReprintPanel({ printer }: ToolsReprintPanelProps) {
  const toast = useToast();
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

  const runHeaderFooter = async (kind: "header-read" | "header-write" | "footer-read" | "footer-write") => {
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
    <div className="space-y-4">
      <section className="rounded-xl border bg-card p-4">
        <h3 className="font-medium">Reimpresión de documentos</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <label className="block text-sm">
            <span className="text-muted">Tipo</span>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              className="mt-1 w-full rounded-lg border bg-background px-3 py-2"
            >
              <option value="FAC">Factura</option>
              <option value="NC">Nota de crédito</option>
              <option value="ND">Nota de débito</option>
              <option value="NF">No fiscal (NF)</option>
              <option value="RX">Reporte X (RX)</option>
            </select>
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="text-muted">Número</span>
            <input
              type="number"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              className="mt-1 w-full rounded-lg border bg-background px-3 py-2"
            />
          </label>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={loading != null}
            onClick={() => void runReprint("visualize")}
            className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-foreground/[0.03] disabled:opacity-50"
          >
            {loading === "visualize" ? <Loader2 className="size-4 animate-spin" /> : null}
            Visualizar
          </button>
          <button
            type="button"
            disabled={loading != null}
            onClick={() => void runReprint("reprint")}
            className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-foreground/[0.03] disabled:opacity-50"
          >
            {loading === "reprint" ? <Loader2 className="size-4 animate-spin" /> : null}
            Reimprimir
          </button>
          <button
            type="button"
            disabled={loading != null}
            onClick={() => void runReportX()}
            className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-foreground/[0.03] disabled:opacity-50"
          >
            {loading === "report-x" ? <Loader2 className="size-4 animate-spin" /> : null}
            Generar reporte X
          </button>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-4">
          <h3 className="font-medium">Encabezado fiscal</h3>
          <textarea
            value={headerContent}
            onChange={(e) => setHeaderContent(e.target.value)}
            rows={4}
            className="mt-3 w-full rounded-lg border bg-background px-3 py-2 text-sm"
          />
          <div className="mt-3 flex gap-2">
            <button type="button" disabled={loading != null} onClick={() => void runHeaderFooter("header-read")} className="rounded-lg border px-3 py-2 text-sm">Leer</button>
            <button type="button" disabled={loading != null} onClick={() => void runHeaderFooter("header-write")} className="rounded-lg border px-3 py-2 text-sm">Guardar</button>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <h3 className="font-medium">Pie de página</h3>
          <textarea
            value={footerContent}
            onChange={(e) => setFooterContent(e.target.value)}
            rows={4}
            className="mt-3 w-full rounded-lg border bg-background px-3 py-2 text-sm"
          />
          <div className="mt-3 flex gap-2">
            <button type="button" disabled={loading != null} onClick={() => void runHeaderFooter("footer-read")} className="rounded-lg border px-3 py-2 text-sm">Leer</button>
            <button type="button" disabled={loading != null} onClick={() => void runHeaderFooter("footer-write")} className="rounded-lg border px-3 py-2 text-sm">Guardar</button>
          </div>
        </div>
      </section>

      {previewHtml ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-xl border bg-card shadow-lg">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h3 className="font-medium">Vista previa del documento</h3>
              <button type="button" onClick={() => setPreviewHtml(null)} aria-label="Cerrar">
                <X className="size-5" />
              </button>
            </div>
            <div
              className="max-h-[70vh] overflow-auto p-4 font-mono text-xs"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
