"use client";

import Link from "next/link";
import { ArrowRight, Building2, RefreshCw } from "lucide-react";
import { navItemsForRole } from "@/lib/navigation";
import type { DashboardSnapshot } from "@/lib/dashboard-data";
import { isPrinterOperative } from "@/lib/printer-status";
import type { Role } from "@/types/user";
import { cn } from "@/lib/utils";

type DashboardWelcomeProps = {
  role: Role;
  snapshot: DashboardSnapshot;
  technicianBranchLabel?: string | null;
  onRefresh: () => void;
  refreshing: boolean;
};

const ROLE_CONTEXT: Record<Role, string> = {
  ADMIN: "Vista global del catálogo operativo y la flota fiscal.",
  TECHNICIAN:
    "Tu inventario de impresoras y empresas en tu distribuidora; servicios e inspecciones en el Libro fiscal.",
  SENIAT: "Consulta del libro fiscal para auditoría tributaria.",
};

export function DashboardWelcome({
  role,
  snapshot,
  technicianBranchLabel,
  onRefresh,
  refreshing,
}: DashboardWelcomeProps) {
  const quickLinks = navItemsForRole(role)
    .filter((item) => !item.disabled && item.href !== "/")
    .slice(0, 4);

  const assignedCount = snapshot.printers.filter(
    (p) => p.status === "asignada",
  ).length;
  const disposedCount = snapshot.printers.filter(
    (p) => p.status === "enajenada",
  ).length;
  const activePrinters = snapshot.printers.filter((p) =>
    isPrinterOperative(p.status),
  ).length;
  const printerLine =
    role === "TECHNICIAN"
      ? snapshot.printers.length > 0
        ? `${snapshot.printers.length} en tu inventario · ${assignedCount} asignada${assignedCount === 1 ? "" : "s"} · ${disposedCount} enajenada${disposedCount === 1 ? "" : "s"} a clientes.`
        : "Aún no hay impresoras en tu inventario."
      : snapshot.printers.length > 0
        ? `${snapshot.printers.length} impresora${snapshot.printers.length === 1 ? "" : "s"} en tu ámbito · ${activePrinters} operativa${activePrinters === 1 ? "" : "s"}.`
        : "Aún no hay impresoras en tu ámbito.";

  return (
    <section className="relative overflow-hidden rounded-xl border border-border bg-gradient-to-br from-card via-card to-accent/5 p-5 shadow-sm sm:p-6">
      <div
        className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-accent/10 blur-3xl"
        aria-hidden
      />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold tracking-tight text-card-foreground sm:text-2xl">
            Panel de control
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
            {ROLE_CONTEXT[role]} {printerLine}
          </p>

          {role === "TECHNICIAN" ? (
            <div className="mt-4 inline-flex max-w-full items-center gap-2.5 rounded-lg border border-border bg-background/70 px-3 py-2.5">
              <Building2
                className="size-4 shrink-0 text-accent"
                aria-hidden
              />
              <p className="min-w-0 text-sm font-medium text-card-foreground">
                {technicianBranchLabel ?? "Sin empresa asignada"}
              </p>
            </div>
          ) : null}
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-foreground/5 disabled:opacity-50"
        >
          <RefreshCw className={cn("size-4", refreshing && "animate-spin")} />
          Actualizar
        </button>
      </div>

      {quickLinks.length > 0 && (
        <nav
          className="relative mt-5 flex flex-wrap gap-2 border-t border-border/80 pt-5"
          aria-label="Accesos rápidos"
        >
          {quickLinks.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-background/80 px-3 py-2 text-sm font-medium text-foreground transition-colors hover:border-accent/40 hover:bg-accent/5"
              >
                <Icon className="size-4 text-accent" aria-hidden />
                {item.title}
                <ArrowRight className="size-3.5 text-muted" aria-hidden />
              </Link>
            );
          })}
        </nav>
      )}
    </section>
  );
}
