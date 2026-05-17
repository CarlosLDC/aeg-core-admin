import { SEAL_COLOR_LABELS } from "@/lib/seal-form";
import type { SealColor } from "@/types/seal";
import { cn } from "@/lib/utils";

const COLOR_DOT: Record<SealColor, string> = {
  azul: "bg-sky-500",
  morado: "bg-violet-500",
  verde: "bg-emerald-600",
  verde_neon: "bg-lime-400",
};

type SealColorBadgeProps = {
  color: SealColor;
};

export function SealColorBadge({ color }: SealColorBadgeProps) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-card-foreground">
      <span
        className={cn("size-2.5 rounded-full", COLOR_DOT[color] ?? "bg-muted")}
        aria-hidden
      />
      {SEAL_COLOR_LABELS[color] ?? color}
    </span>
  );
}
