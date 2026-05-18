import Link from "next/link";
import { cn } from "@/lib/utils";

export function DetailCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <dl className="grid gap-4 sm:grid-cols-2">{children}</dl>
    </div>
  );
}

export function DetailField({
  label,
  value,
  mono,
  fullWidth,
  href,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  fullWidth?: boolean;
  href?: string;
}) {
  const content =
    href && typeof value === "string" ? (
      <Link
        href={href}
        className="font-medium text-accent underline-offset-2 hover:underline"
      >
        {value}
      </Link>
    ) : (
      <span
        className={cn(
          "text-card-foreground",
          mono && "font-mono text-sm",
        )}
      >
        {value}
      </span>
    );

  return (
    <div className={cn(fullWidth && "sm:col-span-2")}>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted">
        {label}
      </dt>
      <dd className="mt-1 text-sm">{content}</dd>
    </div>
  );
}
