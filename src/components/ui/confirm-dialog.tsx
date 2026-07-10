"use client";

import { Loader2 } from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import { cn } from "@/lib/utils";

export type ConfirmDialogOptions = {
  title: string;
  message?: string;
  content?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  /** Solo muestra el botón de confirmación (avisos informativos). */
  alert?: boolean;
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
  content,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  destructive = false,
  alert = false,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!loading) {
      onConfirm();
    }
  }

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
      <form
        className="relative w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl"
        onSubmit={handleSubmit}
        onKeyDown={(event) => {
          if (event.key !== "Enter" || loading) {
            return;
          }
          const target = event.target;
          if (
            target instanceof HTMLInputElement ||
            target instanceof HTMLTextAreaElement ||
            target instanceof HTMLSelectElement
          ) {
            return;
          }
          if (target instanceof HTMLButtonElement && target.type === "button") {
            return;
          }
          event.preventDefault();
          onConfirm();
        }}
      >
        <h2
          id="confirm-dialog-title"
          className="text-lg font-semibold text-card-foreground"
        >
          {title}
        </h2>
        {content ? (
          <div id="confirm-dialog-desc" className="mt-3 space-y-3">
            {content}
          </div>
        ) : message ? (
          <p id="confirm-dialog-desc" className="mt-2 text-sm text-muted">
            {message}
          </p>
        ) : null}
        <div
          className={cn(
            "mt-6 flex gap-2",
            alert
              ? "justify-center"
              : "flex-col-reverse sm:flex-row sm:justify-end",
          )}
        >
          {!alert ? (
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="rounded-lg px-4 py-2 text-sm font-medium text-muted hover:bg-foreground/5 disabled:opacity-50"
            >
              {cancelLabel}
            </button>
          ) : null}
          <button
            type="submit"
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
      </form>
    </div>
  );
}
