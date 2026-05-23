"use client";

import { FormEvent, type ReactNode } from "react";
import { Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

export const BATCH_FORM_INPUT_CLASS =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm shadow-sm outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-ring/20";

type BatchFormDialogProps = {
  open: boolean;
  title: string;
  description?: string;
  error: string | null;
  progress: { done: number; total: number } | null;
  busy: boolean;
  submitDisabled?: boolean;
  onClose: () => void;
  onSubmit: (e: FormEvent) => void;
  children: ReactNode;
};

export function BatchFormDialog({
  open,
  title,
  description,
  error,
  progress,
  busy,
  submitDisabled = false,
  onClose,
  onSubmit,
  children,
}: BatchFormDialogProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="batch-form-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
        aria-label="Cerrar"
        onClick={onClose}
        disabled={busy}
      />
      <div className="relative max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-4 border-b border-border pb-4">
          <div className="space-y-1">
            <h2
              id="batch-form-title"
              className="text-lg font-semibold text-card-foreground"
            >
              {title}
            </h2>
            {description ? (
              <p className="text-sm text-muted">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="shrink-0 rounded-lg p-1.5 text-muted hover:bg-foreground/5 disabled:opacity-50"
          >
            <X className="size-5" />
          </button>
        </div>

        {error && (
          <p
            role="alert"
            className="mb-4 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-300"
          >
            {error}
          </p>
        )}

        {progress && progress.total > 0 && (
          <div
            className="mb-4 rounded-lg border border-border bg-background/70 p-3"
            role="status"
          >
            <p className="mb-2 flex items-center gap-2 text-sm text-muted">
              <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
              Creando {Math.min(progress.done + 1, progress.total)} de{" "}
              {progress.total} registros...
            </p>
            <div className="h-1.5 overflow-hidden rounded-full bg-foreground/10">
              <div
                className="h-full rounded-full bg-accent transition-[width] duration-300"
                style={{
                  width: `${Math.round(
                    (Math.min(progress.done + 1, progress.total) /
                      progress.total) *
                      100,
                  )}%`,
                }}
              />
            </div>
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-5">
          <div className="space-y-5 rounded-xl border border-border bg-background/60 p-4 sm:p-5">
            {children}
          </div>
          <BatchFormDialogFooter
            busy={busy}
            submitDisabled={submitDisabled}
            onClose={onClose}
          />
        </form>
      </div>
    </div>
  );
}

type BatchFormDialogFooterProps = {
  busy: boolean;
  submitDisabled?: boolean;
  onClose: () => void;
};

export function BatchFormDialogFooter({
  busy,
  submitDisabled = false,
  onClose,
}: BatchFormDialogFooterProps) {
  const blocked = busy || submitDisabled;

  return (
    <div className="flex flex-col-reverse gap-2 border-t border-border pt-5 sm:flex-row sm:justify-end [&_button]:w-full sm:[&_button]:w-auto">
      <button
        type="button"
        onClick={onClose}
        disabled={busy}
        className="rounded-lg px-4 py-2 text-sm font-medium text-muted hover:bg-foreground/5 disabled:opacity-50"
      >
        Cancelar
      </button>
      <button
        type="submit"
        disabled={blocked}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground",
          blocked && "cursor-not-allowed opacity-70",
        )}
      >
        {busy && <Loader2 className="size-4 animate-spin" aria-hidden />}
        Crear lote
      </button>
    </div>
  );
}
