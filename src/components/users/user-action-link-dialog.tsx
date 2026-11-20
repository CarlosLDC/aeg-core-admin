"use client";

import { useState } from "react";
import { Check, Copy, Link2, X } from "lucide-react";

type UserActionLinkDialogProps = {
  open: boolean;
  title: string;
  description: string;
  url: string;
  emailStatus?: string | null;
  onClose: () => void;
};

export function UserActionLinkDialog({
  open,
  title,
  description,
  url,
  emailStatus,
  onClose,
}: UserActionLinkDialogProps) {
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="user-action-link-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="Cerrar"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-accent/10 p-2 text-accent">
              <Link2 className="size-5" aria-hidden />
            </div>
            <div>
              <h2
                id="user-action-link-title"
                className="text-lg font-semibold text-card-foreground"
              >
                {title}
              </h2>
              <p className="mt-1 text-sm text-muted">{description}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-1.5 text-muted hover:bg-foreground/5"
          >
            <X className="size-5" />
          </button>
        </div>

        {emailStatus === "FAILED" ? (
          <p className="mt-4 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
            El envío automático por correo falló. Copia este enlace y compártelo
            manualmente con el usuario.
          </p>
        ) : emailStatus === "LOGGED_ONLY" ? (
          <p className="mt-4 rounded-lg border border-sky-500/20 bg-sky-500/10 px-3 py-2 text-xs text-sky-800 dark:text-sky-200">
            El envío automático por correo no está configurado todavía. Copia
            este enlace de un solo uso y compártelo manualmente con el usuario.
          </p>
        ) : null}

        <div className="mt-4 flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={url}
            onFocus={(e) => e.currentTarget.select()}
            className="h-10 min-w-0 flex-1 rounded-lg border border-border bg-foreground/[0.03] px-3 font-mono text-xs text-card-foreground outline-none"
          />
          <button
            type="button"
            onClick={() => void handleCopy()}
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90"
          >
            {copied ? (
              <>
                <Check className="size-4" aria-hidden />
                Copiado
              </>
            ) : (
              <>
                <Copy className="size-4" aria-hidden />
                Copiar enlace
              </>
            )}
          </button>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-muted hover:bg-foreground/5"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
