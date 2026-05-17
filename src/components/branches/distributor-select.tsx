"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { distributorLabel } from "@/lib/branch-roles";
import type { BranchResponse } from "@/types/branch";
import type { DistributorResponse } from "@/types/branch-role";
import type { CompanyResponse } from "@/types/company";
import { cn } from "@/lib/utils";

type DistributorSelectProps = {
  value: string;
  onChange: (value: string) => void;
  distributors: DistributorResponse[];
  branches: BranchResponse[];
  companies: CompanyResponse[];
  disabled?: boolean;
  excludeBranchId?: number;
};

export function DistributorSelect({
  value,
  onChange,
  distributors,
  branches,
  companies,
  disabled,
  excludeBranchId,
}: DistributorSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  const options = useMemo(
    () =>
      distributors.filter((d) => d.branchId !== excludeBranchId),
    [distributors, excludeBranchId],
  );

  const selected = options.find((d) => String(d.id) === value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((d) =>
      distributorLabel(d, branches, companies).toLowerCase().includes(q),
    );
  }, [options, query, branches, companies]);

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

  const triggerLabel = selected
    ? distributorLabel(selected, branches, companies)
    : value === ""
      ? "Sin distribuidor asignado"
      : `Distribuidor #${value}`;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 py-2 text-left text-sm outline-none transition-shadow",
          "focus:border-accent focus:ring-2 focus:ring-ring/20",
          "disabled:cursor-not-allowed disabled:opacity-60",
        )}
      >
        <span className="min-w-0 truncate">{triggerLabel}</span>
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
              placeholder="Buscar distribuidor…"
              className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-ring/30"
              autoFocus
            />
          </div>
          <ul
            className="max-h-44 overflow-y-auto overscroll-contain py-1"
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
                <span className="text-muted">Sin distribuidor</span>
                {value === "" && (
                  <Check className="size-4 shrink-0 text-accent" />
                )}
              </button>
            </li>
            {filtered.length === 0 ? (
              <li className="px-3 py-3 text-center text-xs text-muted">
                No hay distribuidores registrados
              </li>
            ) : (
              filtered.map((distributor) => {
                const id = String(distributor.id);
                const isSelected = value === id;
                return (
                  <li key={distributor.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => pick(id)}
                      className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-foreground/5"
                    >
                      <span className="min-w-0 truncate font-medium text-card-foreground">
                        {distributorLabel(distributor, branches, companies)}
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
