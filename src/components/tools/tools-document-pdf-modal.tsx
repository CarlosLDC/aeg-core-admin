"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Download, Loader2, X } from "lucide-react";
import { toolsPanelSectionClass } from "@/components/tools/tools-ui";
import {
  createToolsDocumentPdfPreview,
  revokeToolsDocumentPdfPreview,
  type ToolsDocumentPdfPreview,
} from "@/lib/tools-pdf-api";
import { cn } from "@/lib/utils";

type ToolsDocumentPdfModalProps = {
  open: boolean;
  title?: string;
  rawContent: string;
  documentType: string;
  documentNumber: number;
  printerSerial?: string;
  onClose: () => void;
};

function buildPdfIframeSrc(pdfUrl: string): string {
  const hash = "page=1&view=FitH&zoom=page-width";
  return pdfUrl.includes("#") ? pdfUrl : `${pdfUrl}#${hash}`;
}

function scrollPdfPreviewToTop(iframe: HTMLIFrameElement | null): void {
  if (!iframe) {
    return;
  }

  const scroll = () => {
    try {
      iframe.contentWindow?.scrollTo(0, 0);
      iframe.contentDocument?.documentElement?.scrollTo(0, 0);
      iframe.contentDocument?.body?.scrollTo(0, 0);
    } catch {
      // El visor PDF puede bloquear acceso al documento interno.
    }
  };

  scroll();
  requestAnimationFrame(scroll);
  for (const delayMs of [50, 150, 300, 600]) {
    window.setTimeout(scroll, delayMs);
  }
}

export function ToolsDocumentPdfModal({
  open,
  title = "Vista previa del documento",
  rawContent,
  documentType,
  documentNumber,
  printerSerial,
  onClose,
}: ToolsDocumentPdfModalProps) {
  const [preview, setPreview] = useState<ToolsDocumentPdfPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handlePdfIframeLoad = useCallback(() => {
    scrollPdfPreviewToTop(iframeRef.current);
  }, []);

  useEffect(() => {
    if (!preview || loading || error) {
      return;
    }
    scrollPdfPreviewToTop(iframeRef.current);
  }, [preview, loading, error]);

  useEffect(() => {
    if (!open) {
      revokeToolsDocumentPdfPreview(preview);
      setPreview(null);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    revokeToolsDocumentPdfPreview(preview);
    setPreview(null);

    void createToolsDocumentPdfPreview({
      rawContent,
      documentType,
      documentNumber,
      printerSerial,
    })
      .then((nextPreview) => {
        if (!cancelled) {
          setPreview(nextPreview);
        } else {
          revokeToolsDocumentPdfPreview(nextPreview);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "No se pudo generar el PDF del documento.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- preview is reset when open changes
  }, [open, rawContent, documentType, documentNumber, printerSerial]);

  useEffect(() => {
    return () => {
      revokeToolsDocumentPdfPreview(preview);
    };
  }, [preview]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Enter") {
        return;
      }
      const target = event.target;
      if (
        target instanceof HTMLButtonElement ||
        target instanceof HTMLAnchorElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLInputElement ||
        target instanceof HTMLSelectElement
      ) {
        return;
      }
      event.preventDefault();
      onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        className={cn(
          toolsPanelSectionClass,
          "flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden p-0",
        )}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h3 className="text-sm font-semibold text-card-foreground">{title}</h3>
          <div className="flex items-center gap-2">
            {preview ? (
              <a
                href={preview.pdfUrl}
                download={preview.filename}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-foreground/[0.03]"
              >
                <Download className="size-3.5" aria-hidden />
                Descargar
              </a>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="rounded-lg p-1 text-muted transition-colors hover:bg-foreground/[0.03] hover:text-foreground"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        <div className="min-h-[50vh] flex-1 bg-foreground/[0.02]">
          {loading ? (
            <div className="flex h-full min-h-[50vh] items-center justify-center gap-2 text-sm text-muted">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Generando PDF...
            </div>
          ) : null}
          {error ? (
            <div className="flex h-full min-h-[50vh] items-center justify-center px-6 text-sm text-rose-600">
              {error}
            </div>
          ) : null}
          {preview && !loading && !error ? (
            <iframe
              ref={iframeRef}
              title={title}
              src={buildPdfIframeSrc(preview.pdfUrl)}
              className="h-[70vh] w-full border-0 bg-white"
              onLoad={handlePdfIframeLoad}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
