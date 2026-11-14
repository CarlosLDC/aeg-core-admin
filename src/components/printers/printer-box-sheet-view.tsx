"use client";

import type { ReactNode } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { NativeSelect } from "@/components/ui/native-select";
import type { PrinterBoxPage } from "@/lib/printer-box-pages";
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

  if (!currentPage) {
    return (
      <EmptyState title="No hay cajas ni impresoras que coincidan con los filtros actuales." />
    );
  }

  const hasPrev = safeIndex > 0;
  const hasNext = safeIndex < totalPages - 1;
  const currentBox = currentPage.box;
  const boxSummary = [
    currentPage.serialRange ? `Seriales: ${currentPage.serialRange}` : null,
    currentPage.subtitle,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <div className="flex flex-col gap-2.5 border-b border-border bg-foreground/[0.02] px-3 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-5">
        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <NativeSelect
            aria-label="Seleccionar caja"
            wrapperClassName="w-full sm:w-56 sm:shrink-0"
            value={String(safeIndex)}
            onChange={(e) => {
              const next = Number(e.target.value);
              if (Number.isInteger(next) && next >= 0 && next < totalPages) {
                onPageIndexChange(next);
              }
            }}
          >
            {pages.map((page, index) => (
              <option key={page.key} value={index}>
                {page.title} ({page.printers.length})
              </option>
            ))}
          </NativeSelect>

          {boxSummary ? (
            <p
              className="min-w-0 truncate text-xs text-muted sm:text-sm"
              title={boxSummary}
            >
              {boxSummary}
            </p>
          ) : null}
        </div>

        {canManageBoxes && (
          <div className="flex flex-wrap items-center gap-2">
            {currentBox && (
              <>
                <button
                  type="button"
                  onClick={() => onEditBox(currentBox)}
                  className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-foreground/5 sm:flex-none"
                >
                  <Pencil className="size-4 shrink-0" aria-hidden />
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteBox(currentBox)}
                  disabled={deletingBoxId === currentBox.id}
                  className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm font-medium text-rose-700 transition-colors hover:border-rose-500/45 hover:bg-rose-500/15 disabled:opacity-50 dark:text-rose-300 dark:hover:bg-rose-500/20 sm:flex-none"
                >
                  <Trash2 className="size-4 shrink-0" aria-hidden />
                  Eliminar
                </button>
              </>
            )}
            <button
              type="button"
              onClick={onCreateBox}
              className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-foreground/5 sm:flex-none"
            >
              <Plus className="size-4 shrink-0" aria-hidden />
              Nueva caja
            </button>
          </div>
        )}
      </div>

      {currentPage.printers.length === 0 ? (
        <EmptyState
          title={`No hay impresoras asignadas en ${currentPage.title}.`}
        />
      ) : (
        renderTable(currentPage.printers)
      )}

      <div className="flex flex-col gap-3 border-t border-border px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <p className="text-center text-sm text-muted sm:text-left">
          Mostrando{" "}
          <span className="font-medium text-foreground">
            {currentPage.printers.length}
          </span>{" "}
          {currentPage.printers.length === 1 ? "impresora" : "impresoras"} en{" "}
          <span className="font-medium text-foreground">
            {currentPage.title}
          </span>
        </p>

        <nav
          aria-label="Paginación de cajas"
          className="flex min-h-10 items-center justify-between gap-1 rounded-lg border border-border bg-foreground/[0.02] px-1 sm:min-h-0 sm:justify-center sm:rounded-none sm:border-0 sm:bg-transparent sm:px-0"
        >
          <button
            type="button"
            onClick={() => onPageIndexChange(safeIndex - 1)}
            disabled={!hasPrev}
            aria-label="Caja anterior"
            className="rounded-lg p-2 text-muted transition-colors hover:bg-foreground/5 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft className="size-4" />
          </button>
          <span className="min-w-0 flex-1 px-2 text-center text-sm text-foreground sm:min-w-[7rem] sm:flex-none">
            Caja {safeIndex + 1} de {totalPages}
          </span>
          <button
            type="button"
            onClick={() => onPageIndexChange(safeIndex + 1)}
            disabled={!hasNext}
            aria-label="Siguiente caja"
            className="rounded-lg p-2 text-muted transition-colors hover:bg-foreground/5 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronRight className="size-4" />
          </button>
        </nav>
      </div>
    </>
  );
}
