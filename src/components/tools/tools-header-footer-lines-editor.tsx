"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  GripVertical,
  Plus,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const lineRowGridClass =
  "grid grid-cols-[1.25rem_1.25rem_1.75rem_minmax(0,1fr)_1.75rem] items-center gap-x-2";

const lineIndexColumnClass =
  "block w-full select-none text-right text-xs tabular-nums leading-none";

const lineGripColumnClass =
  "inline-flex w-[1.25rem] shrink-0 justify-center";

type ToolsHeaderFooterLinesEditorProps = {
  lines: string[];
  disabled?: boolean;
  onChangeLine: (index: number, value: string) => void;
  onRemoveLine: (index: number) => void;
  onAddLine: () => void;
  onMoveLine: (fromIndex: number, toIndex: number) => void;
};

export function ToolsHeaderFooterLinesEditor({
  lines,
  disabled = false,
  onChangeLine,
  onRemoveLine,
  onAddLine,
  onMoveLine,
}: ToolsHeaderFooterLinesEditorProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  function finishDrag() {
    setDragIndex(null);
    setDragOverIndex(null);
  }

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
              onDragOver={(event) => {
                if (disabled) return;
                event.preventDefault();
                setDragOverIndex(index);
              }}
              onDrop={(event) => {
                if (disabled) return;
                event.preventDefault();
                if (dragIndex != null) {
                  onMoveLine(dragIndex, index);
                }
                finishDrag();
              }}
              className={cn(
                "group px-3 py-1.5 transition-colors",
                lineRowGridClass,
                dragOverIndex === index &&
                  dragIndex !== null &&
                  dragIndex !== index &&
                  "bg-accent/10",
              )}
            >
              <button
                type="button"
                draggable={!disabled}
                disabled={disabled}
                aria-label={`Mover línea ${index + 1}`}
                className={cn(
                  lineGripColumnClass,
                  "cursor-grab touch-none rounded p-0.5 text-muted/60 active:cursor-grabbing hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30",
                )}
                onDragStart={(event) => {
                  setDragIndex(index);
                  setDragOverIndex(index);
                  event.dataTransfer.effectAllowed = "move";
                  event.dataTransfer.setData("text/plain", String(index));
                }}
                onDragEnd={finishDrag}
              >
                <GripVertical className="size-3.5" aria-hidden />
              </button>
              <div className="flex flex-col">
                <button
                  type="button"
                  disabled={disabled || index === 0}
                  onClick={() => onMoveLine(index, index - 1)}
                  aria-label={`Subir línea ${index + 1}`}
                  className="inline-flex rounded p-0.5 text-muted/70 enabled:hover:bg-foreground/5 enabled:hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <ChevronUp className="size-3" aria-hidden />
                </button>
                <button
                  type="button"
                  disabled={disabled || index === lines.length - 1}
                  onClick={() => onMoveLine(index, index + 1)}
                  aria-label={`Bajar línea ${index + 1}`}
                  className="inline-flex rounded p-0.5 text-muted/70 enabled:hover:bg-foreground/5 enabled:hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <ChevronDown className="size-3" aria-hidden />
                </button>
              </div>
              <span
                aria-hidden
                className={cn(lineIndexColumnClass, "text-muted/80")}
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
                  "min-w-0 rounded-md border border-transparent bg-transparent px-2 py-1 text-sm outline-none",
                  "focus:border-accent/40 focus:bg-background focus:ring-2 focus:ring-ring/20",
                  "disabled:cursor-not-allowed disabled:opacity-60",
                )}
                spellCheck={false}
              />
              <div className="flex items-center justify-end">
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

      <div className="border-t border-border/60">
        <button
          type="button"
          disabled={disabled}
          onClick={onAddLine}
          aria-label="Añadir línea"
          className="flex w-full items-center justify-center gap-1 rounded-none px-3 py-1.5 text-sm text-accent transition-colors hover:bg-accent/10 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Plus className="size-3.5" aria-hidden />
          Añadir línea
        </button>
      </div>
    </div>
  );
}
