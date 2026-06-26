"use client";

import { useState, type MouseEvent } from "react";
import { Check, Copy } from "lucide-react";
import { useToast } from "@/context/toast-provider";
import { formatPrinterTicketSectionJson } from "@/lib/printer-enajenacion-ticket";
import type { PrinterTicketSection } from "@/types/printer";

function CopyJsonButton({ text, label }: { text: string; label: string }) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  async function handleCopy(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success(`${label} copiado`);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("No se pudo copiar al portapapeles");
    }
  }

  return (
    <button
      type="button"
      onClick={(event) => void handleCopy(event)}
      className="inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-xs font-medium text-muted hover:bg-foreground/5"
    >
      {copied ? (
        <Check className="size-3.5" aria-hidden />
      ) : (
        <Copy className="size-3.5" aria-hidden />
      )}
      Copiar JSON
    </button>
  );
}

type PrinterTicketJsonPreviewProps = {
  fieldName: "header" | "trailer";
  section: PrinterTicketSection | null | undefined;
};

const FIELD_LABELS: Record<PrinterTicketJsonPreviewProps["fieldName"], string> =
  {
    header: 'Campo JSON "header" (encFacFijo)',
    trailer: 'Campo JSON "trailer" (pieFacFijo)',
  };

export function PrinterTicketJsonPreview({
  fieldName,
  section,
}: PrinterTicketJsonPreviewProps) {
  const jsonText = formatPrinterTicketSectionJson(section);
  const label = FIELD_LABELS[fieldName];

  return (
    <details className="rounded-lg border border-border bg-foreground/[0.02] text-sm">
      <summary className="cursor-pointer px-3 py-2 text-xs text-muted">
        Previsualizar {label}
      </summary>
      <div className="border-t border-border">
        <div className="flex justify-end px-3 pt-2">
          <CopyJsonButton text={jsonText} label={label} />
        </div>
        <pre className="max-h-56 overflow-auto px-3 pb-3 font-mono text-xs text-card-foreground">
          {jsonText}
        </pre>
      </div>
    </details>
  );
}

type PrinterTicketConfigPanelProps = {
  header: PrinterTicketSection | null | undefined;
  trailer: PrinterTicketSection | null | undefined;
};

export function PrinterTicketConfigPanel({
  header,
  trailer,
}: PrinterTicketConfigPanelProps) {
  if (!hasTicketPreview(header, trailer)) {
    return null;
  }

  return (
    <div className="space-y-3">
      <PrinterTicketJsonPreview fieldName="header" section={header} />
      <PrinterTicketJsonPreview fieldName="trailer" section={trailer} />
    </div>
  );
}

function hasTicketPreview(
  header: PrinterTicketSection | null | undefined,
  trailer: PrinterTicketSection | null | undefined,
): boolean {
  return (
    (header?.lines?.length ?? 0) > 0 || (trailer?.lines?.length ?? 0) > 0
  );
}
