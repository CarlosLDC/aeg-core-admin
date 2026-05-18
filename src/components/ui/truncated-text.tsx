"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { stopTableRowClick } from "@/components/ui/clickable-table-row";

type TruncatedTextProps = {
  children: string;
  className?: string;
  /** Ancho máximo del texto truncado (clase Tailwind, p. ej. max-w-[160px]). */
  maxClassName?: string;
  href?: string;
};

const EXPAND_THRESHOLD = 28;

export function TruncatedText({
  children,
  className,
  maxClassName = "max-w-[160px]",
  href,
}: TruncatedTextProps) {
  const [expanded, setExpanded] = useState(false);
  const canExpand = children.length > EXPAND_THRESHOLD;

  const text = (
    <span
      className={cn(
        "min-w-0",
        expanded
          ? "whitespace-nowrap"
          : cn("block truncate", maxClassName),
        className,
      )}
      title={!expanded && !canExpand ? children : undefined}
    >
      {children}
    </span>
  );

  const content = href ? (
    <Link
      href={href}
      onClick={stopTableRowClick}
      className="min-w-0 shrink-0 font-medium text-card-foreground underline-offset-2 hover:text-accent hover:underline"
    >
      {text}
    </Link>
  ) : (
    text
  );

  return (
    <span
      data-expanded={expanded ? "true" : undefined}
      className="inline-flex max-w-full flex-nowrap items-center gap-x-1.5"
    >
      {content}
      {canExpand ? (
        <button
          type="button"
          onClick={(e) => {
            stopTableRowClick(e);
            setExpanded((v) => !v);
          }}
          className="shrink-0 text-xs font-medium text-accent hover:underline"
          aria-expanded={expanded}
        >
          {expanded ? "Ocultar" : "Ver completo"}
        </button>
      ) : null}
    </span>
  );
}
