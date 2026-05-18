import Link from "next/link";
import { Eye } from "lucide-react";
import { cn } from "@/lib/utils";

type ViewResourceLinkProps = {
  href: string;
  /** Texto accesible, p. ej. «Ver empresa Acme». */
  label: string;
  className?: string;
};

export function ViewResourceLink({
  href,
  label,
  className,
}: ViewResourceLinkProps) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-lg p-2 text-muted transition-colors hover:bg-accent/10 hover:text-accent",
        className,
      )}
      aria-label={label}
      title="Ver detalle"
    >
      <Eye className="size-4" aria-hidden />
    </Link>
  );
}
