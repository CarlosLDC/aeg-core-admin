"use client";

import { formatSseEventSummary } from "@/lib/enajenacion-sse";
import type { EnajenacionSseEvent } from "@/types/enajenacion-sse";
import { cn } from "@/lib/utils";

function eventTypeClass(type: EnajenacionSseEvent["type"]): string {
  switch (type) {
    case "session_started":
    case "step_transition":
    case "session_completed":
      return "border-emerald-500/30 bg-emerald-500/5";
    case "session_failed":
      return "border-rose-500/30 bg-rose-500/5";
    case "connected":
      return "border-border bg-foreground/[0.02]";
    default:
      return "border-border bg-card";
  }
}

export function EnajenacionSseEventLog({
  events,
  emptyMessage = "Sin eventos SSE todavía.",
  className,
}: {
  events: EnajenacionSseEvent[];
  emptyMessage?: string;
  className?: string;
}) {
  if (events.length === 0) {
    return (
      <p
        className={cn(
          "rounded-lg border border-dashed border-border py-6 text-center text-sm text-muted",
          className,
        )}
      >
        {emptyMessage}
      </p>
    );
  }

  return (
    <ul className={cn("max-h-64 space-y-2 overflow-auto", className)}>
      {[...events].reverse().map((event, index) => (
        <li
          key={`${event.at}-${event.type}-${index}`}
          className={cn(
            "rounded-lg border px-3 py-2 text-sm",
            eventTypeClass(event.type),
          )}
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="font-mono text-xs uppercase text-muted">
              {event.type}
            </span>
            <time className="shrink-0 text-xs text-muted">
              {new Date(event.at).toLocaleTimeString()}
            </time>
          </div>
          <p className="mt-1 text-card-foreground">
            {formatSseEventSummary(event)}
          </p>
          {event.sessionState ? (
            <p className="mt-1 font-mono text-xs text-muted">
              estado: {event.sessionState}
            </p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
