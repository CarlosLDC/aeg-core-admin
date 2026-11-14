"use client";

import { FormEvent, useId, useState } from "react";
import { createPortal } from "react-dom";
import { Building2, X } from "lucide-react";
import { FieldLabel } from "@/components/ui/field-label";
import { FormDialogFooterBar } from "@/components/ui/form-dialog-footer";
import {
  createCommercialClient,
  getCommercialInvoicesErrorMessage,
} from "@/lib/commercial-invoices-api";
import { formFieldInputClass } from "@/lib/toggle-button-styles";
import { cn } from "@/lib/utils";
import type { CommercialClientResponse } from "@/types/commercial-invoice";

type CommercialClientCreateDialogProps = {
  open: boolean;
  onClose: () => void;
  onCreated: (client: CommercialClientResponse) => void;
};

export function CommercialClientCreateDialog({
  open,
  onClose,
  onCreated,
}: CommercialClientCreateDialogProps) {
  const formId = useId();
  const titleId = useId();
  const [nombre, setNombre] = useState("");
  const [rif, setRif] = useState("");
  const [notas, setNotas] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmedNombre = nombre.trim();
    if (!trimmedNombre) {
      setError("El nombre del cliente comercial es obligatorio.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const created = await createCommercialClient({
        nombre: trimmedNombre,
        rif: rif.trim() || null,
        notas: notas.trim() || null,
      });
      setNombre("");
      setRif("");
      setNotas("");
      onCreated(created);
    } catch (err) {
      setError(getCommercialInvoicesErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  function handleClose() {
    if (saving) return;
    setNombre("");
    setRif("");
    setNotas("");
    setError(null);
    onClose();
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="Cerrar"
        onClick={handleClose}
      />
      <div className="relative flex max-h-[min(90vh,100dvh)] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-border bg-card shadow-xl">
        <div className="shrink-0 border-b border-border px-4 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                <Building2 className="size-5" aria-hidden />
              </div>
              <div>
                <h2
                  id={titleId}
                  className="text-base font-semibold leading-snug text-card-foreground sm:text-lg"
                >
                  Nuevo cliente comercial
                </h2>
                <p className="mt-0.5 text-xs text-muted sm:text-sm">
                  Registra un nuevo cliente para las facturas comerciales.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleClose}
              disabled={saving}
              className="rounded-lg p-1.5 text-muted hover:bg-foreground/5 disabled:opacity-50"
              aria-label="Cerrar"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        <form
          id={formId}
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
            {error && (
              <p
                role="alert"
                className="mb-4 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-300"
              >
                {error}
              </p>
            )}

            <div className="space-y-4">
              <label className="block">
                <FieldLabel required>Nombre o razón social</FieldLabel>
                <input
                  type="text"
                  required
                  maxLength={120}
                  value={nombre}
                  disabled={saving}
                  onChange={(e) => {
                    setNombre(e.target.value);
                    setError(null);
                  }}
                  className={formFieldInputClass}
                  placeholder="Ej. Distribuidora Central C.A."
                  autoFocus
                />
              </label>

              <label className="block">
                <FieldLabel>RIF (opcional)</FieldLabel>
                <input
                  type="text"
                  maxLength={20}
                  value={rif}
                  disabled={saving}
                  onChange={(e) => setRif(e.target.value)}
                  className={cn(formFieldInputClass, "font-mono uppercase")}
                  placeholder="J-12345678-9"
                />
              </label>

              <label className="block">
                <FieldLabel>Notas / Observaciones (opcional)</FieldLabel>
                <textarea
                  rows={2}
                  maxLength={255}
                  value={notas}
                  disabled={saving}
                  onChange={(e) => setNotas(e.target.value)}
                  className={cn(formFieldInputClass, "resize-none")}
                  placeholder="Contacto, sucursal o información adicional…"
                />
              </label>
            </div>
          </div>

          <FormDialogFooterBar>
            <button
              type="button"
              onClick={handleClose}
              disabled={saving}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-card-foreground hover:bg-foreground/5 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || !nombre.trim()}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {saving ? "Guardando…" : "Crear cliente"}
            </button>
          </FormDialogFooterBar>
        </form>
      </div>
    </div>,
    document.body,
  );
}
