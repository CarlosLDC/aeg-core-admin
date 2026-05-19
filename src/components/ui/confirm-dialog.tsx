"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type ConfirmDialogOptions = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

type ConfirmDialogProps = ConfirmDialogOptions & {
  open: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-desc"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="Cerrar"
        onClick={onCancel}
        disabled={loading}
      />
      <div className="relative w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
        <h2
          id="confirm-dialog-title"
          className="text-lg font-semibold text-card-foreground"
        >
          {title}
        </h2>
        <p id="confirm-dialog-desc" className="mt-2 text-sm text-muted">
          {message}
        </p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-lg px-4 py-2 text-sm font-medium text-muted hover:bg-foreground/5 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={cn(
              "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-70",
              destructive
                ? "bg-rose-600 text-white hover:bg-rose-700"
                : "bg-accent text-accent-foreground",
            )}
          >
            {loading && <Loader2 className="size-4 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
