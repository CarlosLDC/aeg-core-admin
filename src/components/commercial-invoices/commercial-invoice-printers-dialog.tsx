"use client";

import { type FormEvent, useEffect, useId, useMemo, useState } from "react";
import { Loader2, X } from "lucide-react";
import { PrinterStatusBadge } from "@/components/printers/printer-status-badge";
import { formatCommercialInvoiceTitle } from "@/lib/commercial-invoice-form";
import { printerModelLabel } from "@/lib/printer-form";
import { formFieldInputClass } from "@/lib/toggle-button-styles";
import { cn } from "@/lib/utils";
import type { CommercialInvoiceResponse } from "@/types/commercial-invoice";
import type { PrinterResponse } from "@/types/printer";
import type { PrinterModelResponse } from "@/types/printer-model";

type CommercialInvoicePrintersDialogProps = {
  open: boolean;
  invoice: CommercialInvoiceResponse;
  printers: PrinterResponse[];
  models: PrinterModelResponse[];
  catalogLoading: boolean;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (printerIds: number[]) => void;
};

export function CommercialInvoicePrintersDialog(
  props: CommercialInvoicePrintersDialogProps,
) {
  if (!props.open) return null;
  return <CommercialInvoicePrintersDialogContent {...props} />;
}

function CommercialInvoicePrintersDialogContent({
  invoice,
  printers,
  models,
  catalogLoading,
  saving,
  error,
  onClose,
  onSubmit,
}: Omit<CommercialInvoicePrintersDialogProps, "open">) {
  const titleId = useId();
  const [query, setQuery] = useState("");

  const initialIds = useMemo(
    () =>
      new Set(
        printers
          .filter((p) => p.facturaComercialId === invoice.id)
          .map((p) => p.id),
      ),
    [printers, invoice.id],
  );

  const [draftSelectedIds, setDraftSelectedIds] = useState<Set<number> | null>(
    null,
  );
  const selectedIds = draftSelectedIds ?? initialIds;

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !saving) {
        onClose();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, saving]);

  const modelLabelById = useMemo(() => {
    const map = new Map<number, string>();
    for (const model of models) {
      map.set(model.id, printerModelLabel(model));
    }
    return map;
  }, [models]);

  const visiblePrinters = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...printers]
      .filter((p) => {
        if (!q) {
          return (
            p.facturaComercialId == null ||
            p.facturaComercialId === invoice.id ||
            selectedIds.has(p.id)
          );
        }
        const modelName = (modelLabelById.get(p.modelId) ?? "").toLowerCase();
        return (
          p.fiscalSerial.toLowerCase().includes(q) || modelName.includes(q)
        );
      })
      .sort((a, b) => {
        const aOwn = a.facturaComercialId === invoice.id ? 0 : 1;
        const bOwn = b.facturaComercialId === invoice.id ? 0 : 1;
        if (aOwn !== bOwn) return aOwn - bOwn;
        return a.fiscalSerial.localeCompare(b.fiscalSerial, "es");
      });
  }, [printers, query, invoice.id, selectedIds, modelLabelById]);

  function togglePrinter(printerId: number) {
    setDraftSelectedIds((prev) => {
      const next = new Set(prev ?? initialIds);
      if (next.has(printerId)) {
        next.delete(printerId);
      } else {
        next.add(printerId);
      }
      return next;
    });
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit(Array.from(selectedIds));
  }

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

      <div className="relative flex max-h-[min(90vh,100dvh)] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-border bg-card shadow-xl">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div>
            <h2
              id={titleId}
              className="text-base font-semibold text-card-foreground"
            >
              Impresoras de la factura
            </h2>
            <p className="mt-0.5 text-xs text-muted">
              {formatCommercialInvoiceTitle(invoice)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Cerrar"
            className="rounded-lg p-1 text-muted hover:bg-foreground/5 disabled:opacity-50"
          >
            <X className="size-5" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
            {error ? (
              <p
                role="alert"
                className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-300"
              >
                {error}
              </p>
            ) : null}

            <input
              type="search"
              value={query}
              disabled={saving}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por serial o modelo…"
              className={formFieldInputClass}
              autoFocus
            />

            <div className="max-h-80 overflow-y-auto rounded-lg border border-border">
              {catalogLoading ? (
                <div className="flex items-center gap-2 px-4 py-6 text-sm text-muted">
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  Cargando impresoras…
                </div>
              ) : visiblePrinters.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-muted">
                  No se encontraron impresoras.
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {visiblePrinters.map((printer) => {
                    const checked = selectedIds.has(printer.id);
                    const otherInvoice =
                      printer.facturaComercialId != null &&
                      printer.facturaComercialId !== invoice.id;
                    const modelName =
                      modelLabelById.get(printer.modelId) ??
                      `Modelo #${printer.modelId}`;

                    return (
                      <li key={printer.id}>
                        <label
                          className={cn(
                            "flex cursor-pointer items-center justify-between gap-3 px-3.5 py-2.5 text-sm transition-colors hover:bg-foreground/[0.03]",
                            checked && "bg-accent/[0.05]",
                          )}
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={saving}
                              onChange={() => togglePrinter(printer.id)}
                              className="size-4 shrink-0 rounded border-border accent-accent"
                            />
                            <div className="min-w-0">
                              <span className="block truncate font-mono text-sm font-medium text-card-foreground">
                                {printer.fiscalSerial}
                              </span>
                              <span className="block truncate text-xs text-muted">
                                {modelName}
                                {otherInvoice
                                  ? ` · Factura ${printer.facturaComercialNumero?.trim() || `#${printer.facturaComercialId}`}`
                                  : ""}
                              </span>
                            </div>
                          </div>
                          <PrinterStatusBadge status={printer.status} />
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border px-5 py-3.5">
            <span className="text-xs text-muted">
              {selectedIds.size}{" "}
              {selectedIds.size === 1 ? "seleccionada" : "seleccionadas"}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-card-foreground transition-colors hover:bg-foreground/5 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving || catalogLoading}
                className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                    Guardando…
                  </>
                ) : (
                  "Guardar"
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
