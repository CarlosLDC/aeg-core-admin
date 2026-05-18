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
};

export function TruncatedText({
  children,
  className,
  maxClassName = "max-w-[160px]",
  href,
}: TruncatedTextProps) {
  const textClass = cn(
    "block min-w-0 truncate",
    maxClassName,
    className,
    href &&
      "font-medium text-card-foreground underline-offset-2 hover:text-accent hover:underline",
  );

  const inner = <span className={textClass}>{children}</span>;

  return (
    <HoverTooltip label={children}>
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
