"use client";

import type { FormEvent, ReactNode } from "react";
import { Loader2, X } from "lucide-react";
import type { PrinterResponse } from "@/types/printer";
import { cn } from "@/lib/utils";

export type PrinterActionDialogSize = "md" | "receipt";

type PrinterActionDialogShellProps = {
  title: string;
  titleId: string;
  printer: PrinterResponse;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  children: ReactNode;
  submitLabel: string;
  onSubmit: (event: FormEvent) => void;
  submitDisabled?: boolean;
  submitLoading?: boolean;
  size?: PrinterActionDialogSize;
  cancelLabel?: string;
  onCancel?: () => void;
  submitDestructive?: boolean;
  /** Por defecto muestra el serial bajo el título. */
  showPrinterSerialSubtitle?: boolean;
};

export function PrinterActionDialogShell({
  title,
  titleId,
  printer,
  saving,
  error,
  onClose,
  children,
  submitLabel,
  onSubmit,
  submitDisabled = false,
  submitLoading = false,
  size = "md",
  cancelLabel = "Cancelar",
  onCancel,
  submitDestructive = false,
  showPrinterSerialSubtitle = true,
}: PrinterActionDialogShellProps) {
  const handleCancel = onCancel ?? onClose;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="Cerrar"
        disabled={saving}
        onClick={onClose}
      />
      <div
        className={cn(
          "relative flex max-h-[min(92vh,100dvh)] w-full flex-col overflow-hidden rounded-xl border border-border bg-card shadow-xl",
          size === "receipt" ? "max-w-lg" : "max-w-md",
        )}
      >
        <div className="shrink-0 border-b border-border px-4 py-3 sm:px-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2
                id={titleId}
                className="text-lg font-semibold text-card-foreground"
              >
                {title}
              </h2>
              {showPrinterSerialSubtitle ? (
                <p className="mt-1 text-sm text-muted">
                  Serial{" "}
                  <span className="font-mono text-card-foreground">
                    {printer.fiscalSerial}
                  </span>
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-md p-1 text-muted hover:bg-foreground/5 disabled:opacity-50"
              aria-label="Cerrar"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 py-4 sm:px-5">
            {children}

            {error ? (
              <p
                role="alert"
                className="mt-4 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-300"
              >
                {error}
              </p>
            ) : null}
          </div>

          <div className="shrink-0 border-t border-border px-4 py-4 sm:px-5">
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end [&_button]:w-full sm:[&_button]:w-auto">
              <button
                type="button"
                onClick={handleCancel}
                disabled={saving}
                className="rounded-lg px-4 py-2 text-sm font-medium text-muted hover:bg-foreground/5 disabled:opacity-50"
              >
                {cancelLabel}
              </button>
              <button
                type="submit"
                disabled={saving || submitDisabled}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium",
                  submitDestructive
                    ? "bg-rose-600 text-white hover:bg-rose-700 dark:bg-rose-600 dark:hover:bg-rose-500"
                    : "bg-accent text-accent-foreground",
                  (saving || submitDisabled) &&
                    "cursor-not-allowed opacity-70",
                )}
              >
                {(saving || submitLoading) && (
                  <Loader2 className="size-4 animate-spin" />
                )}
                {submitLabel}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
