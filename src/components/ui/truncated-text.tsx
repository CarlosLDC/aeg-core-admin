"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

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
        expanded ? "whitespace-normal break-words" : cn("block truncate", maxClassName),
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
      className="min-w-0 font-medium text-card-foreground underline-offset-2 hover:text-accent hover:underline"
    >
      {text}
    </Link>
  ) : (
    text
  );

  return (
    <span className="inline-flex min-w-0 max-w-full flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
      {content}
      {canExpand && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="shrink-0 text-xs font-medium text-accent hover:underline"
          aria-expanded={expanded}
        >
          {expanded ? "Ocultar" : "Ver completo"}
        </button>
      )}
    </span>
  );
}
