"use client";

import { Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

type ToolsHeaderFooterLinesEditorProps = {
  lines: string[];
  disabled?: boolean;
  onChangeLine: (index: number, value: string) => void;
  onRemoveLine: (index: number) => void;
  onAddLine: () => void;
};

export function ToolsHeaderFooterLinesEditor({
  lines,
  disabled = false,
  onChangeLine,
  onRemoveLine,
  onAddLine,
}: ToolsHeaderFooterLinesEditorProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-foreground/[0.03] font-mono text-sm">
      {lines.length === 0 ? (
        <p className="px-3 py-4 text-xs text-muted">
          No hay líneas. Añade una para comenzar.
        </p>
      ) : (
        <ul className="divide-y divide-border/60">
          {lines.map((line, index) => (
            <li
              key={`line-${index}`}
              className="group flex items-center gap-2 px-3 py-1.5"
            >
              <span
                aria-hidden
                className="w-7 shrink-0 select-none text-right text-xs text-muted/80 tabular-nums"
              >
                {index + 1}
              </span>
              <input
                type="text"
                value={line}
                disabled={disabled}
                aria-label={`Línea ${index + 1}`}
                onChange={(event) => onChangeLine(index, event.target.value)}
                className={cn(
                  "min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-2 py-1 text-sm outline-none",
                  "focus:border-accent/40 focus:bg-background focus:ring-2 focus:ring-ring/20",
                  "disabled:cursor-not-allowed disabled:opacity-60",
                )}
                spellCheck={false}
              />
              <div className="flex w-7 shrink-0 items-center justify-end">
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onRemoveLine(index)}
                  aria-label={`Eliminar línea ${index + 1}`}
                  className="inline-flex rounded p-1 text-muted/70 opacity-70 transition-all hover:bg-rose-500/10 hover:text-rose-600 hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-30 group-hover:opacity-100"
                >
                  <Trash2 className="size-3.5" aria-hidden />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="border-t border-border/60 px-3 py-2">
        <button
          type="button"
          disabled={disabled}
          onClick={onAddLine}
          className="flex w-full items-center gap-2 rounded-md py-1 text-left text-xs font-medium text-accent transition-colors hover:bg-accent/10 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <span className="w-7 shrink-0" aria-hidden />
          <span className="inline-flex items-center gap-1.5">
            <Plus className="size-3.5" aria-hidden />
            Añadir línea
          </span>
        </button>
      </div>
    </div>
  );
}
