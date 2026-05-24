"use client";

import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

type ClickableTableRowProps = React.ComponentProps<"tr"> & {
  href: string;
};

/** Evita que un clic en controles dispare la navegación de la fila. */
export function stopTableRowClick(e: React.MouseEvent) {
  e.stopPropagation();
}

export function ClickableTableRow({
  href,
  className,
  children,
  onClick,
  ...props
}: ClickableTableRowProps) {
  const router = useRouter();

  return (
    <tr
      {...props}
      className={cn(
        "h-14 cursor-pointer border-b border-border last:border-0 hover:bg-foreground/[0.04]",
        className,
      )}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented) return;
        const target = e.target as HTMLElement;
        if (
          target.closest(
            "a, button, input, select, textarea, label, [data-row-click=ignore]",
          )
        ) {
          return;
        }
        router.push(href);
      }}
    >
      {children}
    </tr>
  );
}
