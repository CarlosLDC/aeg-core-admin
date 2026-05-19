"use client";

import Link from "next/link";
import { ArrowRight, RefreshCw } from "lucide-react";
import { navItemsForRole } from "@/lib/navigation";
import { ROLE_DESCRIPTIONS, ROLE_LABELS, ROLE_STYLES } from "@/lib/roles";
import type { DashboardSnapshot } from "@/lib/dashboard-data";
import type { Role } from "@/types/user";
import { cn } from "@/lib/utils";

type DashboardWelcomeProps = {
  username: string;
  role: Role;
  snapshot: DashboardSnapshot;
  onRefresh: () => void;
  refreshing: boolean;
};

function greetingForHour(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Buenos días";
  if (hour < 19) return "Buenas tardes";
  return "Buenas noches";
}

const ROLE_CONTEXT: Record<Role, string> = {
  ADMIN: "Vista global del catálogo operativo y la flota fiscal.",
  DISTRIBUTOR: "Tu red de impresoras y clientes en un vistazo.",
  TECHNICIAN: "Equipos en campo, precintos y personal de tu ámbito.",
  SERVICE_CENTER: "Empresas, sucursales y operaciones de tu centro.",
};

export function DashboardWelcome({
  username,
  role,
  snapshot,
  onRefresh,
  refreshing,
}: DashboardWelcomeProps) {
  const quickLinks = navItemsForRole(role)
    .filter((item) => !item.disabled && item.href !== "/")
    .slice(0, 4);

  const activePrinters = snapshot.printers.filter((p) => p.status === "activo").length;
  const printerLine =
    snapshot.printers.length > 0
      ? `${snapshot.printers.length} impresora${snapshot.printers.length === 1 ? "" : "s"} en tu ámbito · ${activePrinters} activa${activePrinters === 1 ? "" : "s"}.`
      : role === "SERVICE_CENTER"
        ? "Tu rol no gestiona impresoras directamente."
        : "Aún no hay impresoras en tu ámbito.";

  return (
    <section className="relative overflow-hidden rounded-xl border border-border bg-gradient-to-br from-card via-card to-accent/5 p-5 shadow-sm sm:p-6">
      <div
        className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-accent/10 blur-3xl"
        aria-hidden
      />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted">
            {greetingForHour()}, {username}
          </p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-card-foreground sm:text-2xl">
            Panel de control
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
            {ROLE_CONTEXT[role]} {printerLine}
          </p>
          <span
            className={cn(
              "mt-3 inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
              ROLE_STYLES[role],
            )}
            title={ROLE_DESCRIPTIONS[role]}
          >
            {ROLE_LABELS[role]}
          </span>
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
