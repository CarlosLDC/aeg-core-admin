"use client";

import {
  type ClipboardEvent,
  type FormEvent,
  useEffect,
  useId,
  useMemo,
  useState,
} from "react";
import {
  AlertTriangle,
  Check,
  CheckSquare,
  Loader2,
  Printer,
  Search,
  Square,
  X,
} from "lucide-react";
import { PrinterStatusBadge } from "@/components/printers/printer-status-badge";
import { formatCommercialInvoiceTitle } from "@/lib/commercial-invoice-form";
import { formatInventoryBoxLabel } from "@/lib/inventory-box-form";
import { printerModelLabel } from "@/lib/printer-form";
import { formFieldSearchInputClass } from "@/lib/toggle-button-styles";
import { cn } from "@/lib/utils";
import type { CommercialInvoiceResponse } from "@/types/commercial-invoice";
import type { PrinterResponse } from "@/types/printer";
import type { PrinterModelResponse } from "@/types/printer-model";

type FilterMode = "available" | "selected" | "all";

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

function parseSearchTokens(query: string): string[] {
  return query
    .trim()
    .toLowerCase()
    .split(/[\s,;]+/)
    .map((token) => token.trim())
    .filter(Boolean);
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
  const formId = useId();
  const searchId = useId();

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
  const [filterMode, setFilterMode] = useState<FilterMode>("available");
  const [query, setQuery] = useState("");

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

  const sortedPrinters = useMemo(() => {
    return [...printers].sort((a, b) => {
      const aOwn = a.facturaComercialId === invoice.id ? 0 : a.facturaComercialId == null ? 1 : 2;
      const bOwn = b.facturaComercialId === invoice.id ? 0 : b.facturaComercialId == null ? 1 : 2;
      if (aOwn !== bOwn) return aOwn - bOwn;
      return a.fiscalSerial.localeCompare(b.fiscalSerial, "es");
    });
  }, [printers, invoice.id]);

  const availableCount = useMemo(
    () =>
      sortedPrinters.filter(
        (p) => p.facturaComercialId == null || p.facturaComercialId === invoice.id,
      ).length,
    [sortedPrinters, invoice.id],
  );

  const searchTokens = useMemo(() => parseSearchTokens(query), [query]);
  const isBatchQuery = searchTokens.length > 1;

  const filteredPrinters = useMemo(() => {
    return sortedPrinters.filter((p) => {
      if (filterMode === "available") {
        const isAvailable =
          p.facturaComercialId == null || p.facturaComercialId === invoice.id;
        if (!isAvailable) return false;
      } else if (filterMode === "selected") {
        if (!selectedIds.has(p.id)) return false;
      }

      if (searchTokens.length === 0) return true;

      const serialLower = p.fiscalSerial.toLowerCase();
      const macLower = p.macAddress?.toLowerCase() ?? "";
      const idText = String(p.id);

      if (searchTokens.length > 1) {
        return searchTokens.some(
          (token) =>
            serialLower.includes(token) ||
            (macLower.length > 0 && macLower.includes(token)) ||
            idText === token,
        );
      }

      const token = searchTokens[0];
      const modelName = (modelLabelById.get(p.modelId) ?? "").toLowerCase();
      const boxLabel =
        p.boxNumber != null
          ? formatInventoryBoxLabel(p.boxNumber).toLowerCase()
          : "";
      const invoiceLabel = (p.facturaComercialNumero ?? "").toLowerCase();
      return (
        serialLower.includes(token) ||
        modelName.includes(token) ||
        macLower.includes(token) ||
        boxLabel.includes(token) ||
        invoiceLabel.includes(token) ||
        idText.includes(token)
      );
    });
  }, [
    sortedPrinters,
    filterMode,
    invoice.id,
    selectedIds,
    searchTokens,
    modelLabelById,
  ]);

  const diffSummary = useMemo(() => {
    let toLink = 0;
    let toUnlink = 0;
    let reassignedFromOther = 0;

    for (const id of selectedIds) {
      if (!initialIds.has(id)) {
        toLink++;
      }
    }
    for (const id of initialIds) {
      if (!selectedIds.has(id)) {
        toUnlink++;
      }
    }
    for (const p of printers) {
      if (
        selectedIds.has(p.id) &&
        p.facturaComercialId != null &&
        p.facturaComercialId !== invoice.id
      ) {
        reassignedFromOther++;
      }
    }

    return { toLink, toUnlink, reassignedFromOther };
  }, [selectedIds, initialIds, printers, invoice.id]);

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

  function selectVisible() {
    if (filteredPrinters.length === 0) return;
    setDraftSelectedIds((prev) => {
      const next = new Set(prev ?? initialIds);
      for (const p of filteredPrinters) {
        next.add(p.id);
      }
      return next;
    });
  }

  function unselectVisible() {
    if (filteredPrinters.length === 0) return;
    setDraftSelectedIds((prev) => {
      const next = new Set(prev ?? initialIds);
      for (const p of filteredPrinters) {
        next.delete(p.id);
      }
      return next;
    });
  }

  function clearSelection() {
    if (selectedIds.size === 0) return;
    setDraftSelectedIds(new Set());
  }

  function handleSearchPaste(e: ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData("text");
    if (/[\r\n\t]+/.test(pasted)) {
      e.preventDefault();
      const normalized = pasted
        .split(/[\r\n\t,;]+/)
        .map((item) => item.trim())
        .filter(Boolean)
        .join(", ");
      setQuery(normalized);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit(Array.from(selectedIds));
  }

  const invoiceTitle = formatCommercialInvoiceTitle(invoice);
  const allVisibleSelected =
    filteredPrinters.length > 0 &&
    filteredPrinters.every((p) => selectedIds.has(p.id));
  const anyVisibleSelected = filteredPrinters.some((p) =>
    selectedIds.has(p.id),
  );

  const filterPillClass = (active: boolean) =>
    cn(
      "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors",
      active
        ? "border-accent/35 bg-accent/10 text-accent"
        : "border-border bg-background text-muted hover:bg-foreground/5 hover:text-card-foreground",
    );

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

      <div className="relative flex max-h-[min(92vh,100dvh)] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-border bg-card shadow-xl">
        {/* Header */}
        <div className="shrink-0 border-b border-border px-4 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                  <Printer className="size-4" aria-hidden />
                </span>
                <div className="min-w-0">
                  <h2
                    id={titleId}
                    className="truncate text-lg font-semibold text-card-foreground"
                  >
                    Gestionar impresoras · {invoiceTitle}
                  </h2>
                  <p className="text-xs text-muted">
                    {invoice.empresaNombre ??
                      invoice.clienteComercialNombre ??
                      "Selecciona o pega los seriales de las impresoras asociadas a esta factura."}
                  </p>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              aria-label="Cerrar"
              className="rounded-lg p-1.5 text-muted hover:bg-foreground/5 disabled:opacity-50"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form
          id={formId}
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          {/* Controls bar */}
          <div className="shrink-0 space-y-3 border-b border-border bg-foreground/[0.015] px-4 py-3 sm:px-6">
            {error ? (
              <p
                role="alert"
                className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-300"
              >
                {error}
              </p>
            ) : null}

            <div className="relative">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted"
                aria-hidden
              />
              <input
                id={searchId}
                type="search"
                value={query}
                disabled={saving}
                onPaste={handleSearchPaste}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por serial, modelo, MAC o caja… (pega varios seriales separados por coma o salto de línea)"
                className={cn(formFieldSearchInputClass, "pr-9")}
                autoFocus
              />
              {query.trim().length > 0 ? (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="Limpiar búsqueda"
                  className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded p-1 text-muted hover:bg-foreground/5 hover:text-foreground"
                >
                  <X className="size-3.5" aria-hidden />
                </button>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setFilterMode("available")}
                  className={filterPillClass(filterMode === "available")}
                >
                  Disponibles ({availableCount})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode("selected")}
                  className={filterPillClass(filterMode === "selected")}
                >
                  Seleccionadas ({selectedIds.size})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode("all")}
                  className={filterPillClass(filterMode === "all")}
                >
                  Todas ({sortedPrinters.length})
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {isBatchQuery && filteredPrinters.length > 0 ? (
                  <button
                    type="button"
                    disabled={saving || allVisibleSelected}
                    onClick={selectVisible}
                    className="inline-flex items-center gap-1 rounded-lg bg-accent px-2.5 py-1 text-xs font-medium text-accent-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Check className="size-3.5" aria-hidden />
                    Seleccionar {filteredPrinters.length} coincidencia
                    {filteredPrinters.length === 1 ? "" : "s"}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={
                      saving ||
                      filteredPrinters.length === 0 ||
                      allVisibleSelected
                    }
                    onClick={selectVisible}
                    className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-medium text-card-foreground transition-colors hover:bg-foreground/5 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    <CheckSquare className="size-3.5" aria-hidden />
                    Marcar visibles
                  </button>
                )}

                <button
                  type="button"
                  disabled={saving || !anyVisibleSelected}
                  onClick={unselectVisible}
                  className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-medium text-muted transition-colors hover:bg-foreground/5 hover:text-card-foreground disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <Square className="size-3.5" aria-hidden />
                  Desmarcar visibles
                </button>

                {selectedIds.size > 0 ? (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={clearSelection}
                    className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-medium text-rose-700 transition-colors hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:opacity-45 dark:text-rose-300"
                  >
                    Limpiar selección
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          {/* Printer list */}
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 sm:px-6">
            {catalogLoading ? (
              <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted">
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Cargando impresoras…
              </div>
            ) : filteredPrinters.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center">
                <p className="text-sm font-medium text-card-foreground">
                  No se encontraron impresoras
                </p>
                <p className="mt-1 text-xs text-muted">
                  {filterMode === "available" && query.trim() === ""
                    ? "No hay impresoras disponibles sin factura. Cambia a «Todas» para ver equipos asignados a otras facturas."
                    : "Prueba ajustando la búsqueda o cambiando el filtro activo."}
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-border rounded-xl border border-border bg-background">
                {filteredPrinters.map((printer) => {
                  const checked = selectedIds.has(printer.id);
                  const isOwn = printer.facturaComercialId === invoice.id;
                  const belongsToOther =
                    printer.facturaComercialId != null &&
                    printer.facturaComercialId !== invoice.id;
                  const modelName =
                    modelLabelById.get(printer.modelId) ??
                    `Modelo #${printer.modelId}`;

                  return (
                    <li key={printer.id}>
                      <label
                        className={cn(
                          "flex cursor-pointer items-center justify-between gap-3 px-3.5 py-2.5 transition-colors hover:bg-foreground/[0.03]",
                          checked && "bg-accent/[0.06] hover:bg-accent/[0.09]",
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
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono text-sm font-semibold text-card-foreground">
                                {printer.fiscalSerial}
                              </span>
                              <span className="text-xs text-muted">
                                {modelName}
                              </span>
                              {printer.boxNumber != null ? (
                                <span className="rounded-md border border-border bg-card px-1.5 py-0.5 text-[11px] font-medium text-muted">
                                  {formatInventoryBoxLabel(printer.boxNumber)}
                                </span>
                              ) : null}
                            </div>
                            {printer.macAddress ? (
                              <p className="mt-0.5 font-mono text-[11px] text-muted">
                                MAC: {printer.macAddress}
                              </p>
                            ) : null}
                          </div>
                        </div>

                        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                          {isOwn ? (
                            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                              En esta factura
                            </span>
                          ) : belongsToOther ? (
                            <span
                              title="Esta impresora está vinculada a otra factura. Si la marcas y guardas, se reasignará a esta factura."
                              className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-800 dark:text-amber-200"
                            >
                              <AlertTriangle className="size-3" aria-hidden />
                              Factura{" "}
                              {printer.facturaComercialNumero?.trim() ||
                                `#${printer.facturaComercialId}`}
                            </span>
                          ) : null}
                          <PrinterStatusBadge status={printer.status} />
                        </div>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Footer */}
          <div className="shrink-0 border-t border-border bg-card px-4 py-3.5 sm:px-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                <span className="font-medium text-card-foreground">
                  {selectedIds.size}{" "}
                  {selectedIds.size === 1
                    ? "impresora seleccionada"
                    : "impresoras seleccionadas"}
                </span>
                {diffSummary.toLink > 0 ? (
                  <span className="font-medium text-emerald-700 dark:text-emerald-300">
                    +{diffSummary.toLink} por vincular
                  </span>
                ) : null}
                {diffSummary.toUnlink > 0 ? (
                  <span className="font-medium text-rose-700 dark:text-rose-300">
                    -{diffSummary.toUnlink} por desvincular
                  </span>
                ) : null}
                {diffSummary.reassignedFromOther > 0 ? (
                  <span className="font-medium text-amber-800 dark:text-amber-200">
                    {diffSummary.reassignedFromOther} reasignada
                    {diffSummary.reassignedFromOther === 1 ? "" : "s"} de otra
                    factura
                  </span>
                ) : null}
              </div>

              <div className="flex items-center justify-end gap-2">
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
                    "Guardar asignación"
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
