import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

type ErrorStateProps = {
  message: string;
  onRetry?: () => void;
  retrying?: boolean;
  className?: string;
};

export function ErrorState({
  message,
  onRetry,
  retrying = false,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col gap-3 rounded-lg border border-rose-500/20 bg-rose-500/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <p className="text-sm text-rose-700 dark:text-rose-300">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          disabled={retrying}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-rose-500/30 bg-card px-3 py-1.5 text-sm font-medium text-rose-800 transition-colors hover:bg-rose-500/5 disabled:opacity-50 dark:text-rose-200"
        >
          <RefreshCw className={cn("size-4", retrying && "animate-spin")} />
          Reintentar
        </button>
      ) : null}
    </div>
  );
}
