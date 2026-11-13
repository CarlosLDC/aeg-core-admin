"use client";

import type { ReactNode } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Package,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import {
  SearchableSelect,
  type SearchableSelectOption,
} from "@/components/ui/searchable-select";
import { formatDate } from "@/lib/datetime-form";
import type { PrinterBoxPage } from "@/lib/printer-box-pages";
import { cn } from "@/lib/utils";
import type { InventoryBoxResponse } from "@/types/inventory-box";
import type { PrinterResponse } from "@/types/printer";

type PrinterBoxSheetViewProps = {
  pages: PrinterBoxPage[];
  pageIndex: number;
  onPageIndexChange: (index: number) => void;
  canManageBoxes: boolean;
  onCreateBox: () => void;
  onEditBox: (box: InventoryBoxResponse) => void;
  onDeleteBox: (box: InventoryBoxResponse) => void;
  deletingBoxId: number | null;
  renderTable: (printers: PrinterResponse[]) => ReactNode;
};

export function PrinterBoxSheetView({
  pages,
  pageIndex,
  onPageIndexChange,
  canManageBoxes,
  onCreateBox,
  onEditBox,
  onDeleteBox,
  deletingBoxId,
  renderTable,
}: PrinterBoxSheetViewProps) {
  const totalPages = pages.length;
  const safeIndex =
    totalPages > 0 ? Math.min(Math.max(pageIndex, 0), totalPages - 1) : 0;
  const currentPage = pages[safeIndex] ?? null;

  const boxSelectorOptions: SearchableSelectOption[] = pages.map(
    (page, index) => ({
      value: String(index),
      label: page.title,
      description: [
        `${page.printers.length} ${page.printers.length === 1 ? "impresora" : "impresoras"}`,
        page.serialRange,
        page.subtitle,
      ]
        .filter(Boolean)
        .join(" · "),
      searchText: [
        page.title,
        page.box ? `caja ${page.box.boxNumber}` : "sin caja",
        page.subtitle ?? "",
        page.serialRange ?? "",
      ].join(" "),
    }),
  );

  if (!currentPage) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 shadow-sm">
        <EmptyState title="No hay cajas ni impresoras que coincidan con los filtros actuales." />
      </div>
    );
  }

  const hasPrev = safeIndex > 0;
  const hasNext = safeIndex < totalPages - 1;
  const currentBox = currentPage.box;

  return (
    <div className="space-y-4">
      {/* Barra superior de navegación entre hojas */}
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3.5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="w-full sm:w-64">
            <SearchableSelect
              value={String(safeIndex)}
              onChange={(val) => {
                const next = Number(val);
                if (Number.isInteger(next) && next >= 0 && next < totalPages) {
                  onPageIndexChange(next);
                }
              }}
              options={boxSelectorOptions}
              searchPlaceholder="Ir a caja o serial…"
              modalTitle="Seleccionar hoja de caja"
              preloadOptions
            />
          </div>

          <div className="inline-flex items-center gap-1 rounded-lg border border-border bg-background p-1">
            <button
              type="button"
              onClick={() => onPageIndexChange(0)}
              disabled={!hasPrev}
              title="Primera hoja"
              aria-label="Primera hoja"
              className="inline-flex size-8 items-center justify-center rounded-md text-muted transition hover:bg-foreground/5 hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
            >
              <ChevronsLeft className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => onPageIndexChange(safeIndex - 1)}
              disabled={!hasPrev}
              title="Hoja anterior"
              aria-label="Hoja anterior"
              className="inline-flex size-8 items-center justify-center rounded-md text-muted transition hover:bg-foreground/5 hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="px-2.5 text-xs font-medium tabular-nums text-card-foreground">
              Hoja {safeIndex + 1} de {totalPages}
            </span>
            <button
              type="button"
              onClick={() => onPageIndexChange(safeIndex + 1)}
              disabled={!hasNext}
              title="Siguiente hoja"
              aria-label="Siguiente hoja"
              className="inline-flex size-8 items-center justify-center rounded-md text-muted transition hover:bg-foreground/5 hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
            >
              <ChevronRight className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => onPageIndexChange(totalPages - 1)}
              disabled={!hasNext}
              title="Última hoja"
              aria-label="Última hoja"
              className="inline-flex size-8 items-center justify-center rounded-md text-muted transition hover:bg-foreground/5 hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
            >
              <ChevronsRight className="size-4" />
            </button>
          </div>
        </div>

        {canManageBoxes && (
          <div className="flex flex-wrap items-center gap-2">
            {currentBox && (
              <>
                <button
                  type="button"
                  onClick={() => onEditBox(currentBox)}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-xs font-medium text-foreground transition hover:bg-foreground/5"
                >
                  <Pencil className="size-3.5" />
                  Editar caja
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteBox(currentBox)}
                  disabled={deletingBoxId === currentBox.id}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-rose-500/25 bg-rose-500/5 px-3 text-xs font-medium text-rose-700 transition hover:bg-rose-500/10 disabled:opacity-50 dark:text-rose-300"
                >
                  <Trash2 className="size-3.5" />
                  Eliminar caja
                </button>
              </>
            )}
            <button
              type="button"
              onClick={onCreateBox}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-xs font-medium text-foreground transition hover:bg-foreground/5"
            >
              <Plus className="size-3.5" />
              Nueva caja
            </button>
          </div>
        )}
      </div>

      {/* Tira rápida de índices de hojas */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {pages.map((page, index) => {
          const active = index === safeIndex;
          return (
            <button
              key={page.key}
              type="button"
              onClick={() => onPageIndexChange(index)}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition",
                active
                  ? "border-accent bg-accent text-accent-foreground shadow-xs"
                  : "border-border bg-card text-muted hover:bg-foreground/5 hover:text-card-foreground",
              )}
            >
              <span className="whitespace-nowrap">
                {page.box ? `Caja ${page.box.boxNumber}` : "Sin caja"}
              </span>
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
                  active
                    ? "bg-white/20 text-accent-foreground"
                    : "bg-foreground/10 text-muted",
                )}
              >
                {page.printers.length}
              </span>
            </button>
          );
        })}
      </div>

      {/* Hoja de la Caja actual */}
      <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <header className="border-b border-border bg-foreground/[0.025] px-5 py-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3.5">
              <div
                className={cn(
                  "flex size-11 shrink-0 items-center justify-center rounded-xl border",
                  currentPage.kind === "box"
                    ? "border-accent/25 bg-accent/10 text-accent"
                    : "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300",
                )}
              >
                <Package className="size-5" />
              </div>
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-semibold tracking-tight text-card-foreground">
                    {currentPage.title}
                  </h2>
                  <span className="inline-flex items-center rounded-full border border-border bg-background px-2.5 py-0.5 text-xs font-medium tabular-nums text-card-foreground">
                    {currentPage.printers.length}{" "}
                    {currentPage.printers.length === 1
                      ? "impresora"
                      : "impresoras"}
                  </span>
                </div>
                <p className="text-xs text-muted">
                  {currentPage.subtitle || "Sin observaciones registradas."}
                  {currentBox
                    ? ` · Registrada el ${formatDate(currentBox.createdAt)}`
                    : ""}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {currentPage.serialRange && (
                <div className="rounded-lg border border-border bg-background px-3 py-1.5">
                  <span className="block text-[10px] font-medium uppercase tracking-wider text-muted">
                    Rango de seriales
                  </span>
                  <span className="font-mono text-xs font-semibold text-card-foreground">
                    {currentPage.serialRange}
                  </span>
                </div>
              )}
            </div>
          </div>

          {currentPage.statusCounts.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-border/60 pt-3">
              <span className="mr-1 text-[11px] font-medium text-muted">
                Resumen:
              </span>
              {currentPage.statusCounts.map((item) => (
                <span
                  key={item.status}
                  className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-0.5 text-[11px] text-card-foreground"
                >
                  <span className="font-semibold tabular-nums">
                    {item.count}
                  </span>
                  <span className="text-muted">{item.label}</span>
                </span>
              ))}
            </div>
          )}
        </header>

        {currentPage.printers.length === 0 ? (
          <div className="p-8">
            <EmptyState title={`No hay impresoras asignadas en ${currentPage.title}.`} />
          </div>
        ) : (
          renderTable(currentPage.printers)
        )}

        <footer className="flex flex-col gap-2 border-t border-border bg-foreground/[0.015] px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted">
            Hoja <span className="font-medium text-card-foreground">{safeIndex + 1}</span> de{" "}
            <span className="font-medium text-card-foreground">{totalPages}</span> ·{" "}
            {currentPage.printers.length}{" "}
            {currentPage.printers.length === 1
              ? "impresora en esta caja"
              : "impresoras en esta caja"}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onPageIndexChange(safeIndex - 1)}
              disabled={!hasPrev}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-border bg-background px-3 text-xs font-medium text-foreground transition hover:bg-foreground/5 disabled:pointer-events-none disabled:opacity-40"
            >
              <ChevronLeft className="size-3.5" />
              Caja anterior
            </button>
            <button
              type="button"
              onClick={() => onPageIndexChange(safeIndex + 1)}
              disabled={!hasNext}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-border bg-background px-3 text-xs font-medium text-foreground transition hover:bg-foreground/5 disabled:pointer-events-none disabled:opacity-40"
            >
              Siguiente caja
              <ChevronRight className="size-3.5" />
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
