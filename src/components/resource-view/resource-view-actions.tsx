import { Loader2, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

type ResourceViewActionsProps = {
  onEdit?: () => void;
  onDelete?: () => void;
  deleting?: boolean;
  editLabel?: string;
  deleteLabel?: string;
};

export function ResourceViewActions({
  onEdit,
  onDelete,
  deleting = false,
  editLabel = "Editar",
  deleteLabel = "Eliminar",
}: ResourceViewActionsProps) {
  if (!onEdit && !onDelete) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {onEdit ? (
        <button
          type="button"
          onClick={onEdit}
          disabled={deleting}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-foreground/5 disabled:opacity-50"
        >
          <Pencil className="size-4" aria-hidden />
          {editLabel}
        </button>
      ) : null}
      {onDelete ? (
        <button
          type="button"
          onClick={onDelete}
          disabled={deleting}
          className={cn(
            "inline-flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm font-medium text-rose-700 transition-colors",
            "hover:border-rose-500/45 hover:bg-rose-500/15",
            "dark:text-rose-300 dark:hover:bg-rose-500/20",
            "disabled:opacity-50",
          )}
        >
          {deleting ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Trash2 className="size-4" aria-hidden />
          )}
          {deleteLabel}
        </button>
      ) : null}
    </div>
  );
}
