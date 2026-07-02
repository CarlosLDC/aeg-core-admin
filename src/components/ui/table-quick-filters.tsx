"use client";

import type { ReactNode } from "react";
import { filterToggleButtonClass } from "@/lib/toggle-button-styles";
import { cn } from "@/lib/utils";

type TableQuickFiltersProps = {
  label?: string;
  children: ReactNode;
  className?: string;
};

/** Barra de filtros rápidos sobre tablas; en móvil usa cuadrícula 2×N. */
export function TableQuickFilters({
  label = "Filtros rápidos",
  children,
  className,
}: TableQuickFiltersProps) {
  return (
    <div
      className={cn(
        "border-b border-border bg-foreground/[0.02] px-3 py-3 sm:px-5",
        className,
      )}
    >
      <p className="mb-2 text-xs font-medium text-muted">{label}</p>
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
        {children}
      </div>
    </div>
  );
}

type TableQuickFilterButtonProps = {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
};

export function TableQuickFilterButton({
  active,
  onClick,
  children,
  className,
  disabled,
}: TableQuickFilterButtonProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={filterToggleButtonClass(active, {
        disabled,
        className: cn(
          "w-full justify-center rounded-md sm:w-auto",
          className,
        ),
      })}
    >
      {children}
    </button>
  );
}
