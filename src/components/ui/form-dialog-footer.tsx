import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type FormDialogFooterProps = {
  mode: "create" | "edit";
  saving: boolean;
  submitDisabled?: boolean;
  onClose: () => void;
  createLabel?: string;
  saveLabel?: string;
};

export function FormDialogFooter({
  mode,
  saving,
  submitDisabled = false,
  onClose,
  createLabel = "Crear",
  saveLabel = "Guardar",
}: FormDialogFooterProps) {
  const submitBlocked = saving || submitDisabled;

  return (
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end [&_button]:w-full sm:[&_button]:w-auto">
      <button
        type="button"
        onClick={onClose}
        disabled={saving}
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
  );
}
