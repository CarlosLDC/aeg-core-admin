"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { PAGE_SIZE_OPTIONS, type UsePaginationReturn } from "@/hooks/use-pagination";
import { formFieldNativeSelectClass } from "@/lib/toggle-button-styles";
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
      <p className="text-center text-sm text-muted sm:text-left">
        Mostrando{" "}
        <span className="font-medium text-foreground">{startIndex}</span>–
        <span className="font-medium text-foreground">{endIndex}</span> de{" "}
        <span className="font-medium text-foreground">{totalItems}</span>
      </p>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <label className="flex min-h-10 items-center justify-between gap-3 rounded-lg border border-border bg-foreground/[0.02] px-3 text-sm text-muted sm:min-h-0 sm:justify-start sm:gap-2 sm:rounded-none sm:border-0 sm:bg-transparent sm:px-0">
          <span className="shrink-0">Filas por página</span>
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className={cn(
              formFieldNativeSelectClass,
              "h-9 w-[4.5rem] shrink-0 px-2 sm:h-10 sm:w-auto sm:min-w-[4.5rem]",
            )}
            aria-label="Filas por página"
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>

        <nav
          aria-label="Paginación de la tabla"
          className="flex min-h-10 items-center justify-between gap-1 rounded-lg border border-border bg-foreground/[0.02] px-1 sm:min-h-0 sm:justify-center sm:rounded-none sm:border-0 sm:bg-transparent sm:px-0"
        >
          <button
            type="button"
            onClick={() => setPage(page - 1)}
            disabled={page <= 1}
            className="rounded-lg p-2 text-muted transition-colors hover:bg-foreground/5 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Página anterior"
          >
            <ChevronLeft className="size-4" />
          </button>
          <span className="min-w-0 flex-1 px-2 text-center text-sm text-foreground sm:min-w-[7rem] sm:flex-none">
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
        </nav>
      </div>
    </div>
  );
}
