import { Loader2, Pencil, Trash2, XCircle } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type ResourceViewActionsProps = {
  onEdit?: () => void;
  onDelete?: () => void;
  onCancelReview?: () => void;
  /** Acciones adicionales junto a Editar (p. ej. Contrato). */
  leadingActions?: ReactNode;
  deleting?: boolean;
  editLabel?: string;
  deleteLabel?: string;
  cancelReviewLabel?: string;
  /** Si es true, renderiza los botones sin contenedor div para integrarlos en un grid padre. */
  asFragment?: boolean;
  className?: string;
  buttonClassName?: string;
};

export function ResourceViewActions({
  onEdit,
  onDelete,
  onCancelReview,
  leadingActions,
  deleting = false,
  editLabel = "Editar",
  deleteLabel = "Eliminar",
  cancelReviewLabel = "Cancelar revisión",
  asFragment = false,
  className,
  buttonClassName,
}: ResourceViewActionsProps) {
  const busy = deleting;
  if (!onEdit && !onDelete && !onCancelReview && !leadingActions) return null;

  const buttons = (
    <>
      {onEdit ? (
        <button
          type="button"
          onClick={onEdit}
          disabled={busy}
          className={cn(
            "inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-foreground/5 disabled:opacity-50",
            buttonClassName,
          )}
        >
          <Pencil className="size-4 shrink-0" aria-hidden />
          {editLabel}
        </button>
      ) : null}
      {leadingActions}
      {onCancelReview ? (
        <button
          type="button"
          onClick={onCancelReview}
          disabled={busy}
          className={cn(
            "inline-flex items-center justify-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm font-medium text-amber-800 transition-colors hover:bg-amber-500/15 disabled:opacity-50 dark:text-amber-200",
            buttonClassName,
          )}
        >
          {deleting ? (
            <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
          ) : (
            <XCircle className="size-4 shrink-0" aria-hidden />
          )}
          {cancelReviewLabel}
        </button>
      ) : null}
      {onDelete ? (
        <button
          type="button"
          onClick={onDelete}
          disabled={busy}
          className={cn(
            "inline-flex items-center justify-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm font-medium text-rose-700 transition-colors",
            "hover:border-rose-500/45 hover:bg-rose-500/15",
            "dark:text-rose-300 dark:hover:bg-rose-500/20",
            "disabled:opacity-50",
            buttonClassName,
          )}
        >
          {deleting ? (
            <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
          ) : (
            <Trash2 className="size-4 shrink-0" aria-hidden />
          )}
          {deleteLabel}
        </button>
      ) : null}
    </>
  );

  if (asFragment) {
    return buttons;
  }

  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center [&>*:last-child:nth-child(odd)]:col-span-2 sm:[&>*:last-child:nth-child(odd)]:col-span-1",
        className,
      )}
    >
      {buttons}
    </div>
  );
}
