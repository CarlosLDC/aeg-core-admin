"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { PAGE_SIZE_OPTIONS, type UsePaginationReturn } from "@/hooks/use-pagination";
import { cn } from "@/lib/utils";

type TablePaginationProps<T> = {
  pagination: UsePaginationReturn<T>;
  className?: string;
};

export function TablePagination<T>({
  pagination,
  className,
}: TablePaginationProps<T>) {
  const {
    page,
    setPage,
    pageSize,
    setPageSize,
    totalPages,
    totalItems,
    startIndex,
    endIndex,
  } = pagination;

  if (totalItems === 0) return null;

  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-t border-border px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5",
        className,
      )}
    >
      <p className="text-sm text-muted">
        Mostrando{" "}
        <span className="font-medium text-foreground">{startIndex}</span>–
        <span className="font-medium text-foreground">{endIndex}</span> de{" "}
        <span className="font-medium text-foreground">{totalItems}</span>
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-muted">
          Filas por página
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground outline-none focus:border-accent focus:ring-1 focus:ring-ring/30"
            aria-label="Filas por página"
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setPage(page - 1)}
            disabled={page <= 1}
            className="rounded-lg p-2 text-muted transition-colors hover:bg-foreground/5 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Página anterior"
          >
            <ChevronLeft className="size-4" />
          </button>
          <span className="min-w-[7rem] px-2 text-center text-sm text-foreground">
            Página {page} de {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage(page + 1)}
            disabled={page >= totalPages}
            className="rounded-lg p-2 text-muted transition-colors hover:bg-foreground/5 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Página siguiente"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
