"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type PrinterSelectOption = {
  id: number;
  label: string;
};

type PrinterSelectProps = {
  value: string;
  onChange: (value: string) => void;
  options: PrinterSelectOption[];
  disabled?: boolean;
  loading?: boolean;
  emptyLabel?: string;
  searchPlaceholder?: string;
};

export function PrinterSelect({
  value,
  onChange,
  options,
  disabled,
  loading,
  emptyLabel = "Sin asignar",
  searchPlaceholder = "Buscar por serial o ID…",
}: PrinterSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  const selected = options.find((opt) => String(opt.id) === value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((opt) => {
      const haystack = `${opt.id} ${opt.label}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [options, query]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  function pick(next: string) {
    onChange(next);
    setOpen(false);
    setQuery("");
  }

  const triggerLabel = loading
    ? "Cargando impresoras…"
    : value === ""
      ? emptyLabel
      : selected
        ? selected.label
        : `Impresora #${value}`;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled || loading}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 py-2 text-left text-sm outline-none transition-shadow",
          "focus:border-accent focus:ring-2 focus:ring-ring/20",
          "disabled:cursor-not-allowed disabled:opacity-60",
        )}
      >
        <span className="min-w-0 truncate font-mono">{triggerLabel}</span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-muted transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border border-border bg-card shadow-lg">
          <div className="border-b border-border p-2">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-ring/30"
              autoFocus
            />
          </div>

          <ul
            className="max-h-48 overflow-y-auto overscroll-contain py-1"
            role="listbox"
          >
            <li>
              <button
                type="button"
                role="option"
                aria-selected={value === ""}
                onClick={() => pick("")}
                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-foreground/5"
              >
                <span className="text-muted">{emptyLabel}</span>
                {value === "" && <Check className="size-4 shrink-0 text-accent" />}
              </button>
            </li>
            {filtered.length === 0 ? (
              <li className="px-3 py-3 text-center text-xs text-muted">
                Sin resultados
              </li>
            ) : (
              filtered.map((opt) => {
                const id = String(opt.id);
                const isSelected = value === id;
                return (
                  <li key={opt.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => pick(id)}
                      className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-foreground/5"
                    >
                      <span className="min-w-0 truncate font-mono text-sm text-card-foreground">
                        {opt.label}
                      </span>
                      {isSelected && (
                        <Check className="size-4 shrink-0 text-accent" />
                      )}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
