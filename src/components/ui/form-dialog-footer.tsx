import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type FormDialogFooterProps = {
  mode: "create" | "edit";
  saving: boolean;
  deleting?: boolean;
  submitDisabled?: boolean;
  onClose: () => void;
  onDelete?: () => void;
  createLabel?: string;
  saveLabel?: string;
};

export function FormDialogFooter({
  mode,
  saving,
  deleting = false,
  submitDisabled = false,
  onClose,
  onDelete,
  createLabel = "Crear",
  saveLabel = "Guardar",
}: FormDialogFooterProps) {
  const busy = saving || deleting;
  const submitBlocked = busy || submitDisabled;

  return (
    <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="order-2 sm:order-1">
        {mode === "edit" && onDelete ? (
          <button
            type="button"
            onClick={onDelete}
            disabled={busy}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm font-medium text-rose-700 transition-colors hover:border-rose-500/45 hover:bg-rose-500/15 disabled:opacity-50 dark:text-rose-300 dark:hover:bg-rose-500/20 sm:w-auto"
          >
            {deleting && <Loader2 className="size-4 animate-spin" />}
            Eliminar
          </button>
        ) : null}
      </div>
      <div className="order-1 flex flex-col-reverse gap-2 sm:order-2 sm:flex-row sm:justify-end [&_button]:w-full sm:[&_button]:w-auto">
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          className="rounded-lg px-4 py-2 text-sm font-medium text-muted hover:bg-foreground/5 disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={submitBlocked}
          className={cn(
            "flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground",
            submitBlocked && "cursor-not-allowed opacity-70",
          )}
        >
          {saving && <Loader2 className="size-4 animate-spin" />}
          {mode === "create" ? createLabel : saveLabel}
        </button>
      </div>
    </div>
  );
}
