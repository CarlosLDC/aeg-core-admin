"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { Eye, Loader2, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type TableRowActionsMenuProps = {
  viewHref: string;
  viewLabel: string;
  onEdit?: () => void;
  editLabel?: string;
  onDelete?: () => void;
  deleteLabel?: string;
  deleting?: boolean;
};

const menuItemClass =
  "flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-card-foreground transition-colors hover:bg-foreground/5";

export function TableRowActionsMenu({
  viewHref,
  viewLabel,
  onEdit,
  editLabel = "Editar",
  onDelete,
  deleteLabel = "Eliminar",
  deleting = false,
}: TableRowActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (
        rootRef.current &&
        !rootRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div ref={rootRef} className="relative flex justify-end">
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          setOpen((value) => !value);
        }}
        className="rounded-lg p-2 text-muted transition-colors hover:bg-foreground/5 hover:text-foreground"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        title="Acciones"
        aria-label={`Acciones: ${viewLabel}`}
      >
        <MoreHorizontal className="size-4" aria-hidden />
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 top-full z-50 mt-1 min-w-40 rounded-lg border border-border bg-card py-1 shadow-lg"
          onClick={(event) => event.stopPropagation()}
        >
          <Link
            href={viewHref}
            role="menuitem"
            className={cn(menuItemClass, "text-muted hover:text-accent")}
            aria-label={viewLabel}
            onClick={close}
          >
            <Eye className="size-4 shrink-0" aria-hidden />
            Ver
          </Link>
          {onEdit ? (
            <button
              type="button"
              role="menuitem"
              className={menuItemClass}
              onClick={() => {
                close();
                onEdit();
              }}
            >
              <Pencil className="size-4 shrink-0" aria-hidden />
              {editLabel}
            </button>
          ) : null}
          {onDelete ? (
            <button
              type="button"
              role="menuitem"
              disabled={deleting}
              className={cn(
                menuItemClass,
                "text-rose-700 hover:bg-rose-500/10 hover:text-rose-700 disabled:opacity-50 dark:text-rose-300",
              )}
              onClick={() => {
                close();
                onDelete();
              }}
            >
              {deleting ? (
                <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
              ) : (
                <Trash2 className="size-4 shrink-0" aria-hidden />
              )}
              {deleteLabel}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
