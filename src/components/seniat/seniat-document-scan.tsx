"use client";

import { useRef, useState } from "react";
import { FileText, Loader2, ScanLine, Upload } from "lucide-react";
import type { SeniatExtractResult } from "@/lib/seniat-extract";
import {
  requestSeniatExtract,
  SENIAT_SCAN_ACCEPT,
} from "@/lib/seniat-extract-client";
import { cn } from "@/lib/utils";

type SeniatDocumentScanProps = {
  onExtracted: (data: SeniatExtractResult) => void;
  disabled?: boolean;
  className?: string;
  /** Copy y CTA para flujo de registro de cliente */
  variant?: "default" | "client";
  onRequestManual?: () => void;
  /** Inicia el análisis en cuanto se elige un archivo (flujo cliente). */
  analyzeOnSelect?: boolean;
};

export function SeniatDocumentScan({
  onExtracted,
  disabled = false,
  className,
  variant = "default",
  onRequestManual,
  analyzeOnSelect = false,
}: SeniatDocumentScanProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notConfigured, setNotConfigured] = useState(false);

  async function analyze(fileToAnalyze?: File) {
    const target = fileToAnalyze ?? file;
    if (!target || disabled || analyzing) return;
    setAnalyzing(true);
    setError(null);
    setNotConfigured(false);
    try {
      const data = await requestSeniatExtract(target);
      onExtracted(data);
    } catch (err) {
      const code =
        err instanceof Error
          ? (err as Error & { code?: string }).code
          : undefined;
      if (code === "GEMINI_NOT_CONFIGURED") {
        setNotConfigured(true);
        setError(
          "IA no configurada. Completa el formulario manualmente o añade GEMINI_API_KEY.",
        );
      } else {
        setError(
          err instanceof Error
            ? err.message
            : "No se pudo analizar el documento.",
        );
      }
    } finally {
      setAnalyzing(false);
    }
  }

  function onPick(fileList: FileList | null) {
    if (!fileList?.length) return;
    const picked = fileList[0];
    setFile(picked);
    setError(null);
    setNotConfigured(false);
    if (analyzeOnSelect) {
      void analyze(picked);
    }
  }

  const showAnalyzeButton = !analyzeOnSelect;

  return (
    <div className={cn("space-y-3", className)}>
      <input
        ref={inputRef}
        type="file"
        accept={SENIAT_SCAN_ACCEPT}
        className="sr-only"
        disabled={disabled || analyzing}
        onChange={(e) => onPick(e.target.files)}
      />

      <div
        className={cn(
          "rounded-xl border border-dashed border-border bg-foreground/[0.02] px-4 py-4",
          disabled && "opacity-60",
        )}
      >
        <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:text-left">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
            {analyzing ? (
              <Loader2 className="size-5 animate-spin" aria-hidden />
            ) : file?.type === "application/pdf" ? (
              <FileText className="size-5" aria-hidden />
            ) : (
              <Upload className="size-5" aria-hidden />
            )}
          </div>
          <div className="min-w-0 flex-1 space-y-0.5">
            <p className="text-sm font-medium text-card-foreground">
              {variant === "client"
                ? "Escanear RIF"
                : "Documento fiscal (SENIAT)"}
            </p>
            <p className="text-xs leading-relaxed text-muted">
              {variant === "client"
                ? analyzeOnSelect
                  ? "Elige imagen o PDF del RIF; se analizará al instante."
                  : "Imagen o PDF del RIF. La IA rellena razón social y ubicación."
                : "Sube una foto o PDF del RIF o registro fiscal. La IA rellenará los datos de la empresa."}
            </p>
            {file && (
              <p className="truncate pt-1 text-xs text-card-foreground">
                {analyzing ? "Analizando documento…" : file.name}
              </p>
            )}
          </div>
          <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row">
            <button
              type="button"
              disabled={disabled || analyzing}
              onClick={() => inputRef.current?.click()}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-foreground/5 disabled:opacity-50"
            >
              {file && analyzeOnSelect ? "Cambiar archivo" : "Elegir archivo"}
            </button>
            {showAnalyzeButton && (
              <button
                type="button"
                disabled={disabled || analyzing || !file}
                onClick={() => void analyze()}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-foreground transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              >
                {analyzing ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <ScanLine className="size-4" />
                )}
                {analyzing
                  ? "Analizando…"
                  : variant === "client"
                    ? "Escanear y continuar"
                    : "Analizar"}
              </button>
            )}
          </div>
        </div>
      </div>

      {variant === "client" && onRequestManual && (
        <p className="text-center text-sm text-muted">
          <button
            type="button"
            disabled={disabled || analyzing}
            onClick={onRequestManual}
            className="font-medium text-foreground underline-offset-2 hover:underline disabled:opacity-50"
          >
            Ingresar manualmente
          </button>
        </p>
      )}

      {notConfigured && (
        <p className="rounded-lg border border-amber-200/70 bg-amber-500/8 px-3 py-2 text-sm text-amber-900 dark:border-amber-500/25 dark:text-amber-100">
          Configura <code className="text-xs">GEMINI_API_KEY</code> en el
          servidor para habilitar el análisis automático.
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="rounded-lg border border-amber-200/70 bg-amber-500/8 px-3 py-2 text-sm text-amber-900 dark:border-amber-500/25 dark:text-amber-100"
        >
          {error}
        </p>
      )}
    </div>
  );
}
