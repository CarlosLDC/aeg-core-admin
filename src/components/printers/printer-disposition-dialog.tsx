"use client";

import { FormEvent, useId, useMemo, useState } from "react";
import { Check, Loader2, Search, X } from "lucide-react";
import type { SelectOption } from "@/components/printers/printer-form-dialog";
import { PrinterStatusTransition } from "@/components/printers/printer-status-transition";
import { FieldLabel } from "@/components/ui/field-label";
import { useConfirm } from "@/context/confirm-provider";
import type { PrinterResponse } from "@/types/printer";
import { cn } from "@/lib/utils";

type PrinterDispositionDialogProps = {
  printer: PrinterResponse;
  saving: boolean;
  error: string | null;
  clientOptions: SelectOption[];
  catalogLoading: boolean;
  onClose: () => void;
  onSubmit: (clientId: number) => void;
};

function resolveDefaultClientId(
  printer: PrinterResponse,
  clientOptions: SelectOption[],
): string {
  if (printer.clientId != null) {
    return String(printer.clientId);
  }
  return "";
}

export function PrinterDispositionDialog({
  printer,
  saving,
  error,
  clientOptions,
  catalogLoading,
  onClose,
  onSubmit,
}: PrinterDispositionDialogProps) {
  const confirm = useConfirm();
  const titleId = useId();
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [clientOverride, setClientOverride] = useState<string | null>(null);
  const [clientQuery, setClientQuery] = useState("");
  const defaultClientId = useMemo(
    () => resolveDefaultClientId(printer, clientOptions),
    [printer, clientOptions],
  );
  const clientId = clientOverride ?? defaultClientId;
  const disabled = saving || catalogLoading;

  const selectedClientLabel = useMemo(() => {
    const id = Number(clientId);
    if (!Number.isFinite(id) || id <= 0) return null;
    return clientOptions.find((opt) => opt.id === id)?.label ?? null;
  }, [clientId, clientOptions]);
  const filteredClientOptions = useMemo(() => {
    const q = clientQuery.trim().toLowerCase();
    if (!q) return clientOptions;
    return clientOptions.filter((opt) =>
      `${opt.id} ${opt.label}`.toLowerCase().includes(q),
    );
  }, [clientOptions, clientQuery]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const id = Number(clientId);
    if (!Number.isFinite(id) || id <= 0) {
      setFieldError("Selecciona un cliente válido.");
      return;
    }
    setFieldError(null);

    const accepted = await confirm({
      title: "Confirmar enajenación",
      content: (
        <>
          <p className="text-sm text-muted">
            Vas a enajenar la impresora{" "}
            <span className="font-mono text-card-foreground">
              {printer.fiscalSerial}
            </span>
            {selectedClientLabel ? (
              <>
                {" "}
                al cliente{" "}
                <strong className="text-card-foreground">{selectedClientLabel}</strong>
              </>
            ) : null}
            . Esta acción actualiza el estado de la impresora.
          </p>
          <PrinterStatusTransition from="asignada" to="enajenada" />
        </>
      ),
      confirmLabel: "Enajenar impresora",
      destructive: true,
    });
    if (!accepted) return;

    onSubmit(id);
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
      <div className="relative flex max-h-[min(92vh,100dvh)] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-border bg-card shadow-xl">
        <div className="shrink-0 border-b border-border px-4 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2
                id={titleId}
                className="text-lg font-semibold text-card-foreground"
              >
                Enajenar impresora
              </h2>
              <p className="mt-1 text-sm text-muted">
                Serial{" "}
                <span className="font-mono text-card-foreground">
                  {printer.fiscalSerial}
                </span>
              </p>
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

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
            <div>
              <FieldLabel>Cliente</FieldLabel>
              <div className="relative mt-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
                <input
                  type="text"
                  value={clientQuery}
                  onChange={(e) => setClientQuery(e.target.value)}
                  placeholder="Buscar cliente por nombre o ID…"
                  disabled={disabled}
                  className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-ring/20 disabled:opacity-60"
                />
              </div>
              <div className="mt-2 max-h-64 overflow-y-auto rounded-lg border border-border bg-background/30">
                {catalogLoading ? (
                  <p className="px-3 py-2 text-sm text-muted">Cargando clientes…</p>
                ) : filteredClientOptions.length === 0 ? (
                  <p className="px-3 py-2 text-sm text-muted">
                    {clientOptions.length === 0
                      ? "Sin clientes disponibles"
                      : "Sin resultados"}
                  </p>
                ) : (
                  <ul className="py-1">
                    {filteredClientOptions.map((opt) => {
                      const isSelected = String(opt.id) === clientId;
                      return (
                        <li key={opt.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setClientOverride(String(opt.id));
                              setFieldError(null);
                            }}
                            disabled={disabled}
                            className={cn(
                              "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-foreground/5 disabled:opacity-60",
                              isSelected && "bg-accent/10",
                            )}
                          >
                            <span className="truncate">{opt.label}</span>
                            {isSelected ? (
                              <Check className="size-4 shrink-0 text-accent" />
                            ) : null}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
              {fieldError ? (
                <p className="mt-1 text-sm text-rose-600 dark:text-rose-400">
                  {fieldError}
                </p>
              ) : null}
            </div>

            {error ? (
              <p
                role="alert"
                className="mt-4 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-300"
              >
                {error}
              </p>
            ) : null}
          </div>

          <div className="shrink-0 border-t border-border px-4 py-4 sm:px-6">
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end [&_button]:w-full sm:[&_button]:w-auto">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="rounded-lg px-4 py-2 text-sm font-medium text-muted hover:bg-foreground/5 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={disabled || !clientId || clientOptions.length === 0}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground",
                  (disabled || !clientId || clientOptions.length === 0) &&
                    "cursor-not-allowed opacity-70",
                )}
              >
                {saving && <Loader2 className="size-4 animate-spin" />}
                Enajenar impresora
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
