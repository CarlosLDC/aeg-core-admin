"use client";

import { useRef, useState } from "react";
import { FileText, Loader2, ScanLine, Upload } from "lucide-react";
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
};

export function PaymentReceiptScan({
  onExtracted,
  onRequestManual,
  disabled = false,
}: PaymentReceiptScanProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function analyze(target: File) {
    setAnalyzing(true);
    setError(null);
    try {
      const data = await requestPaymentExtract(target);
      onExtracted(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo analizar el comprobante.",
      );
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <div className="space-y-2">
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
          void analyze(picked);
        }}
      />
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <button
          type="button"
          disabled={disabled || analyzing}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-border bg-card px-3.5 py-2 text-sm font-medium sm:min-h-10 sm:w-auto",
            "hover:bg-foreground/5 disabled:opacity-50",
          )}
        >
          {analyzing ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : file?.type === "application/pdf" ? (
            <FileText className="size-4" aria-hidden />
          ) : (
            <ScanLine className="size-4" aria-hidden />
          )}
          {analyzing ? "Analizando comprobante…" : "Escanear comprobante"}
        </button>
        {onRequestManual ? (
          <button
            type="button"
            disabled={disabled || analyzing}
            onClick={onRequestManual}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium text-accent hover:bg-accent/10 disabled:opacity-50 sm:min-h-10 sm:w-auto"
          >
            <Upload className="size-4" aria-hidden />
            Llenar manualmente
          </button>
        ) : null}
      </div>
      <p className="text-xs text-muted">
        Sube una foto o PDF del comprobante. La IA rellena método, monto, referencia, cuenta y fecha. Puedes corregirlos después.
      </p>
      {error ? (
        <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>
      ) : null}
    </div>
  );
}
