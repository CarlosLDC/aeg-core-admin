"use client";

import { createContext, useContext } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type DetailSectionLayout = "default" | "quad";

const DetailSectionLayoutContext = createContext<DetailSectionLayout>("default");

export function DetailCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <dl className="grid gap-4 sm:grid-cols-2">{children}</dl>
    </div>
  );
}

export function DetailSection({
  title,
  children,
  layout = "default",
}: {
  title: string;
  children: React.ReactNode;
  layout?: DetailSectionLayout;
}) {
  const isQuad = layout === "quad";

  return (
    <DetailSectionLayoutContext.Provider value={layout}>
      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-card-foreground">{title}</h3>
        <dl
          className={cn(
            isQuad
              ? "mt-4 grid grid-cols-4 gap-x-6 gap-y-5 content-start"
              : "mt-4 grid gap-4 sm:grid-cols-2",
          )}
        >
          {children}
        </dl>
      </section>
    </DetailSectionLayoutContext.Provider>
  );
}

export function DetailField({
  label,
  value,
  mono,
  fullWidth,
  span = 2,
  href,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  /** Solo en layout `default`: ocupa toda la fila en sm+. */
  fullWidth?: boolean;
  /** Solo en layout `quad`: columnas de 4 (por defecto 2 = mitad de fila). */
  span?: 2 | 4;
  href?: string;
}) {
  const layout = useContext(DetailSectionLayoutContext);
  const isQuad = layout === "quad";

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
    <div
      className={cn(
        isQuad
          ? span === 4
            ? "col-span-4"
            : "col-span-2"
          : fullWidth && "sm:col-span-2",
      )}
    >
      <dt className="text-xs font-medium uppercase tracking-wide text-muted">
        {label}
      </dt>
      <dd className="mt-1 text-sm">{content}</dd>
    </div>
  );
}
