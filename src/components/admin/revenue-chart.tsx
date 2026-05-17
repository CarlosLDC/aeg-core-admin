const bars = [42, 58, 45, 72, 65, 88, 76, 94, 82, 68, 91, 85];

const months = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
];

export function RevenueChart() {
  const max = Math.max(...bars);

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-semibold text-card-foreground">Ingresos</h2>
          <p className="text-sm text-muted">Resumen anual 2026</p>
        </div>
        <p className="text-2xl font-semibold tracking-tight text-card-foreground">
          €124.8k
          <span className="ml-2 text-sm font-medium text-emerald-600">+18.2%</span>
        </p>
      </div>

      <div className="flex h-48 items-end gap-2 sm:gap-3">
        {bars.map((value, i) => (
          <div key={months[i]} className="flex flex-1 flex-col items-center gap-2">
            <div
              className="w-full max-w-8 rounded-t-md bg-gradient-to-t from-indigo-600 to-violet-500 transition-all hover:opacity-90"
              style={{ height: `${(value / max) * 100}%` }}
              title={`${months[i]}: ${value}%`}
            />
            <span className="text-[10px] text-muted sm:text-xs">{months[i]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
