"use client";

import Link from "next/link";
import { HoverTooltip } from "@/components/ui/hover-tooltip";
import { stopTableRowClick } from "@/components/ui/clickable-table-row";
import { cn } from "@/lib/utils";

type TruncatedTextProps = {
  children: string;
  className?: string;
  /** Ancho máximo del texto truncado (clase Tailwind, p. ej. max-w-[160px]). */
  maxClassName?: string;
  href?: string;
  mono?: boolean;
};

export function TruncatedText({
  children,
  className,
  maxClassName = "max-w-[160px]",
  href,
  mono,
}: TruncatedTextProps) {
  const textClass = cn(
    "block min-w-0 truncate",
    maxClassName,
    mono && "font-mono text-sm",
    className,
    href &&
      "font-medium text-card-foreground underline-offset-2 hover:text-accent hover:underline",
  );

  const inner = (
    <span className={textClass} data-truncate-measure>
      {children}
    </span>
  );

  return (
    <HoverTooltip label={children} onlyWhenOverflow>
      {href ? (
        <Link href={href} onClick={stopTableRowClick} className="block min-w-0">
          {inner}
        </Link>
      ) : (
        inner
      )}
    </HoverTooltip>
  );
}
