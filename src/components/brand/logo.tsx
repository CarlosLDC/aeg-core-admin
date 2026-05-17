import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

type BrandLogoProps = {
  variant?: "full" | "mark";
  /** Muestra el logo en blanco (para fondos oscuros como el sidebar) */
  onDark?: boolean;
  /** Centrado óptico del isotipo (sidebar contraído) */
  centered?: boolean;
  className?: string;
  href?: string | null;
  priority?: boolean;
};

export function BrandLogo({
  variant = "full",
  onDark = false,
  centered = false,
  className,
  href = "/",
  priority = false,
}: BrandLogoProps) {
  const isMark = variant === "mark";

  const image = (
    <Image
      src={isMark ? "/favicon.png" : "/logo.png"}
      alt={isMark ? "AEG" : "Alpha Engineer Group"}
      width={isMark ? 36 : 180}
      height={isMark ? 36 : 48}
      priority={priority}
      className={cn(
        "object-contain",
        centered && isMark ? "object-center" : "object-left",
        isMark ? "size-9" : "h-10 w-auto max-w-[180px]",
        onDark && "brightness-0 invert",
        className,
      )}
    />
  );

  if (href === null || href === undefined) {
    return <span className="inline-flex shrink-0 items-center">{image}</span>;
  }

  return (
    <Link href={href} className="inline-flex shrink-0 items-center">
      {image}
    </Link>
  );
}
