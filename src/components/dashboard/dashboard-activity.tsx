import { Building2, Contact, Printer, type LucideIcon } from "lucide-react";
import type { DashboardActivity } from "@/lib/dashboard-data";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

type DashboardActivityProps = {
  items: DashboardActivity[];
  className?: string;
};

function iconForActivity(id: string): LucideIcon {
  if (id.startsWith("printer-")) return Printer;
  if (id.startsWith("employee-")) return Contact;
  return Building2;
}

export function DashboardActivityList({
  items,
  className,
}: DashboardActivityProps) {
  return (
    <div
      className={cn(
        "flex h-full flex-col rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5",
        className,
      )}
    >
      <div className="border-b border-border pb-4">
        <h2 className="font-semibold text-card-foreground">Actividad reciente</h2>
        <p className="mt-0.5 text-sm text-muted">
          Altas de equipos, personal y sucursales
        </p>
      </div>

      {items.length === 0 ? (
        <EmptyState
          className="py-10"
          title="Sin movimientos recientes"
          description="Cuando se registren impresoras, empleados o sucursales aparecerán aquí."
        />
      ) : (
        <ul className="mt-4 flex-1 space-y-1 overflow-y-auto">
          {items.map((item) => {
            const Icon = iconForActivity(item.id);
            return (
              <li key={item.id}>
                <div className="flex items-start gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-foreground/[0.03]">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-snug text-card-foreground">
                      {item.label}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">{item.time}</p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
