"use client";

import { useRef, useState } from "react";
import { FileText, Loader2, Upload } from "lucide-react";
import type { PaymentExtractResult } from "@/lib/payment-extract";
import {
  PAYMENT_SCAN_ACCEPT,
  requestPaymentExtract,
} from "@/lib/payment-extract-client";
import { cn } from "@/lib/utils";

type PaymentReceiptScanProps = {
  onExtracted: (data: PaymentExtractResult) => void;
  onRequestManual?: () => void;
  disabled?: boolean;
  className?: string;
};

export function PaymentReceiptScan({
  onExtracted,
  onRequestManual,
  disabled = false,
  className,
}: PaymentReceiptScanProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notConfigured, setNotConfigured] = useState(false);

  async function analyze(target: File) {
    if (disabled || analyzing) return;
    setAnalyzing(true);
    setError(null);
    setNotConfigured(false);
    try {
      const data = await requestPaymentExtract(target);
      onExtracted(data);
    } catch (err) {
      const code =
        err instanceof Error
          ? (err as Error & { code?: string }).code
          : undefined;
      if (code === "GEMINI_NOT_CONFIGURED") {
        setNotConfigured(true);
        setError(
          "IA no configurada. Completa el pago manualmente o añade GEMINI_API_KEY.",
        );
      } else {
        setError(
          err instanceof Error
            ? err.message
            : "No se pudo analizar el comprobante.",
        );
      }
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <div className={cn("space-y-3", className)}>
      <input
        ref={inputRef}
        type="file"
        accept={PAYMENT_SCAN_ACCEPT}
        className="sr-only"
        disabled={disabled || analyzing}
        onChange={(e) => {
          const picked = e.target.files?.[0];
          e.target.value = "";
          if (!picked) return;
          setFile(picked);
          setError(null);
          setNotConfigured(false);
          void analyze(picked);
        }}
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
              Escanear comprobante
            </p>
            <p className="text-xs leading-relaxed text-muted">
              Elige imagen o PDF del comprobante; se analizará al instante.
            </p>
            {file && (
              <p className="truncate pt-1 text-xs text-card-foreground">
                {analyzing ? "Analizando comprobante…" : file.name}
              </p>
            )}
          </div>
          <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row">
            <button
              type="button"
              disabled={disabled || analyzing}
              onClick={() => inputRef.current?.click()}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-foreground/5 disabled:opacity-50"
            >
              {file ? "Cambiar archivo" : "Elegir archivo"}
            </button>
          </div>
        </div>
      </div>

      {onRequestManual && (
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
