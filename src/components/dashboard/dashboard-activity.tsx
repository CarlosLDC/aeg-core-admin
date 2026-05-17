import type { DashboardActivity } from "@/lib/dashboard-data";
import { cn } from "@/lib/utils";

type DashboardActivityProps = {
  items: DashboardActivity[];
  className?: string;
};

export function DashboardActivityList({
  items,
  className,
}: DashboardActivityProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-5 shadow-sm",
        className,
      )}
    >
      <h2 className="font-semibold text-card-foreground">Actividad reciente</h2>
      <p className="text-sm text-muted">Últimos movimientos en el sistema</p>
      {items.length === 0 ? (
        <p className="mt-6 text-sm text-muted">Sin actividad reciente.</p>
      ) : (
        <ul className="mt-6 space-y-4">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-start gap-3 border-b border-border pb-4 last:border-0 last:pb-0"
            >
              <span className="mt-1.5 size-2 shrink-0 rounded-full bg-accent" />
              <div>
                <p className="text-sm font-medium text-card-foreground">
                  {item.label}
                </p>
                <p className="text-xs text-muted">{item.time}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
