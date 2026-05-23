import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Inbox, SearchX } from "lucide-react";
import { cn } from "@/lib/utils";

type EmptyStateProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: LucideIcon;
  compact?: boolean;
  className?: string;
};

export function EmptyState({
  title,
  description,
  action,
  icon: Icon = Inbox,
  compact = false,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 px-4 text-center",
        compact ? "py-12" : "py-16",
        className,
      )}
    >
      <div
        className={cn(
          "flex items-center justify-center rounded-full bg-foreground/5 text-muted",
          compact ? "size-10" : "size-12",
        )}
        aria-hidden
      >
        <Icon className={compact ? "size-5" : "size-6"} strokeWidth={1.5} />
      </div>
      <p
        className={cn(
          "text-sm",
          compact ? "text-muted" : "font-medium text-card-foreground",
        )}
      >
        {title}
      </p>
      {description ? (
        <p className="max-w-sm text-sm text-muted">{description}</p>
      ) : null}
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}

export function TableFilterEmptyState({ className }: { className?: string }) {
  return (
    <EmptyState
      compact
      icon={SearchX}
      title="No hay resultados con los filtros aplicados."
      className={className}
    />
  );
}
