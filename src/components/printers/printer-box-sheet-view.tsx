"use client";

import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import type { PrinterBoxPage } from "@/lib/printer-box-pages";
import type { InventoryBoxResponse } from "@/types/inventory-box";
import type { PrinterResponse } from "@/types/printer";

type PrinterBoxSheetViewProps = {
  pages: PrinterBoxPage[];
  pageIndex: number;
  onPageIndexChange: (index: number) => void;
  canManageBoxes?: boolean;
  onCreateBox?: () => void;
  onEditBox?: (box: InventoryBoxResponse) => void;
  onDeleteBox?: (box: InventoryBoxResponse) => void;
  deletingBoxId?: number | null;
  renderTable: (printers: PrinterResponse[]) => ReactNode;
};

export function PrinterBoxSheetView({
  pages,
  pageIndex,
  onPageIndexChange,
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

  return (
    <>
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
