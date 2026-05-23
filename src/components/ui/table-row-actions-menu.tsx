"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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

const MENU_GAP_PX = 4;

type MenuCoords = {
  top: number;
  left: number;
  openUp: boolean;
};

function countMenuItems(hasEdit: boolean, hasDelete: boolean): number {
  return 1 + (hasEdit ? 1 : 0) + (hasDelete ? 1 : 0);
}

function computeMenuCoords(
  trigger: HTMLElement,
  menu: HTMLElement | null,
  hasEdit: boolean,
  hasDelete: boolean,
): MenuCoords {
  const rect = trigger.getBoundingClientRect();
  const menuHeight = menu?.offsetHeight ?? countMenuItems(hasEdit, hasDelete) * 40 + 8;
  const spaceBelow = window.innerHeight - rect.bottom;
  const spaceAbove = rect.top;
  const openUp =
    spaceBelow < menuHeight + MENU_GAP_PX && spaceAbove > spaceBelow;

  return {
    top: openUp ? rect.top - MENU_GAP_PX : rect.bottom + MENU_GAP_PX,
    left: rect.right,
    openUp,
  };
}

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
  const [coords, setCoords] = useState<MenuCoords | null>(null);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const hasEdit = Boolean(onEdit);
  const hasDelete = Boolean(onDelete);

  const updateCoords = () => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    setCoords(computeMenuCoords(trigger, menuRef.current, hasEdit, hasDelete));
  };

  useLayoutEffect(() => {
    if (!open) {
      setCoords(null);
      return;
    }

    updateCoords();
    const frame = requestAnimationFrame(updateCoords);

    const onScroll = () => setOpen(false);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", updateCoords);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", updateCoords);
    };
  }, [open, hasEdit, hasDelete]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        rootRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
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

  const menu =
    open && coords ? (
      <div
        id={menuId}
        ref={menuRef}
        role="menu"
        className="fixed z-[100] min-w-40 rounded-lg border border-border bg-card py-1 shadow-lg"
        style={{
          top: coords.top,
          left: coords.left,
          transform: coords.openUp
            ? "translate(-100%, -100%)"
            : "translateX(-100%)",
        }}
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
    ) : null;

  return (
    <div ref={rootRef} className="relative flex justify-end">
      <button
        ref={triggerRef}
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          if (open) {
            setOpen(false);
            return;
          }
          if (triggerRef.current) {
            setCoords(
              computeMenuCoords(
                triggerRef.current,
                null,
                hasEdit,
                hasDelete,
              ),
            );
          }
          setOpen(true);
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
      {typeof document !== "undefined" && menu
        ? createPortal(menu, document.body)
        : null}
    </div>
  );
}
