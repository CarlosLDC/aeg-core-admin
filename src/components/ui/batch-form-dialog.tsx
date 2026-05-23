"use client";

import { FormEvent, type ReactNode } from "react";
import { Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

export const BATCH_FORM_INPUT_CLASS =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-ring/20";

type BatchFormDialogProps = {
  open: boolean;
  title: string;
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
        className="absolute inset-0 bg-black/50"
        aria-label="Cerrar"
        onClick={onClose}
        disabled={busy}
      />
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <h2
            id="batch-form-title"
            className="text-lg font-semibold text-card-foreground"
          >
            {title}
          </h2>
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
          <p className="mb-4 flex items-center gap-2 text-sm text-muted">
            <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
            Creando {Math.min(progress.done + 1, progress.total)} de {progress.total}…
          </p>
        )}

        <form onSubmit={onSubmit} className="space-y-5">
          {children}
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
