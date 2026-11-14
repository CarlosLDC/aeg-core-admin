"use client";

import { Loader2 } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

export function normalizeConfirmText(value?: string | null): string {
  return value?.trim() ?? "";
}

export function isConfirmTextMatch(
  typed: string,
  requiredText?: string | null,
): boolean {
  const expected = normalizeConfirmText(requiredText);
  if (!expected) return true;
  return typed.trim() === expected;
}

export type ConfirmDialogOptions = {
  title: string;
  message?: string;
  content?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  /** Solo muestra el botón de confirmación (avisos informativos). */
  alert?: boolean;
  /**
   * Nombre o identificador exacto del recurso que el usuario debe escribir para
   * habilitar el botón de confirmación.
   */
  requireConfirmationText?: string;
};

type ConfirmDialogProps = ConfirmDialogOptions & {
  open: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  requireConfirmationText,
  ...rest
}: ConfirmDialogProps) {
  if (!open || typeof document === "undefined") return null;
  const expectedText = normalizeConfirmText(requireConfirmationText);
  return createPortal(
    <ConfirmDialogInner key={expectedText} expectedText={expectedText} {...rest} />,
    document.body,
  );
}

function ConfirmDialogInner({
  title,
  message,
  content,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  destructive = false,
  alert = false,
  expectedText,
  loading = false,
  onConfirm,
  onCancel,
}: Omit<ConfirmDialogProps, "open" | "requireConfirmationText"> & {
  expectedText: string;
}) {
  const [typedText, setTypedText] = useState("");
  const requiresTypedConfirmation = expectedText.length > 0;
  const canConfirm = isConfirmTextMatch(typedText, expectedText);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!loading && canConfirm) {
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
          if (event.key !== "Enter" || loading || !canConfirm) {
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
        {requiresTypedConfirmation ? (
          <div className="mt-4 space-y-1.5">
            <label
              htmlFor="confirm-dialog-input"
              className="block text-xs text-muted"
            >
              Para confirmar, escribe{" "}
              <span className="select-all font-semibold text-card-foreground">
                {expectedText}
              </span>
              :
            </label>
            <input
              id="confirm-dialog-input"
              type="text"
              value={typedText}
              onChange={(event) => setTypedText(event.target.value)}
              disabled={loading}
              autoFocus
              autoComplete="off"
              spellCheck={false}
              placeholder={expectedText}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 disabled:opacity-50"
            />
          </div>
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
            disabled={loading || !canConfirm}
            className={cn(
              "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50",
              destructive
                ? "bg-rose-600 text-white hover:bg-rose-700 disabled:hover:bg-rose-600"
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
