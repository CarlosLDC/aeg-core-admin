import { Activity, Building2, Contact, Printer, type LucideIcon } from "lucide-react";
import type { DashboardActivity } from "@/lib/dashboard-data";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

const MAX_VISIBLE = 6;

type DashboardActivityProps = {
  items: DashboardActivity[];
  className?: string;
};

function iconForActivity(id: string): LucideIcon {
  if (id.startsWith("printer-")) return Printer;
  if (id.startsWith("employee-")) return Contact;
  return Building2;
}

function activityTone(id: string): string {
  if (id.startsWith("printer-")) return "bg-sky-500/10 text-sky-600 dark:text-sky-400";
  if (id.startsWith("employee-")) return "bg-violet-500/10 text-violet-600 dark:text-violet-400";
  return "bg-amber-500/10 text-amber-700 dark:text-amber-300";
}

export function DashboardActivityList({
  items,
  className,
}: DashboardActivityProps) {
  const visible = items.slice(0, MAX_VISIBLE);
  const hasMore = items.length > MAX_VISIBLE;

  return (
    <div
      className={cn(
        "flex flex-col rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5 xl:max-h-none",
        className,
      )}
    >
      <div className="shrink-0 border-b border-border pb-4">
        <h2 className="font-semibold text-card-foreground">Actividad reciente</h2>
        <p className="mt-0.5 text-sm text-muted">
          Últimos registros en tu ámbito
        </p>
      </div>

      {items.length === 0 ? (
        <EmptyState
          className="py-10"
          icon={Activity}
          title="Sin movimientos recientes"
          description="Cuando se registren impresoras, empleados o sucursales aparecerán aquí."
        />
      ) : (
        <>
          <ul className="mt-4 max-h-[22rem] space-y-1 overflow-y-auto overscroll-contain pr-1 xl:max-h-[28rem]">
            {visible.map((item) => {
              const Icon = iconForActivity(item.id);
              return (
                <li key={item.id}>
                  <div className="flex items-start gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-foreground/[0.03]">
                    <span
                      className={cn(
                        "flex size-8 shrink-0 items-center justify-center rounded-lg",
                        activityTone(item.id),
                      )}
                    >
                      <Icon className="size-4" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-card-foreground">
                        {item.label}
                      </p>
                      <p className="mt-0.5 text-xs text-muted">{item.time}</p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          {hasMore ? (
            <p className="mt-3 border-t border-border pt-3 text-center text-xs text-muted">
              y {items.length - MAX_VISIBLE} más en el historial del sistema
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}
