const orders = [
  {
    id: "#ORD-2847",
    customer: "María García",
    product: "Plan Pro",
    amount: "€149",
    status: "Completado",
  },
  {
    id: "#ORD-2846",
    customer: "Juan Pérez",
    product: "Plan Starter",
    amount: "€49",
    status: "Pendiente",
  },
  {
    id: "#ORD-2845",
    customer: "Ana López",
    product: "Plan Enterprise",
    amount: "€499",
    status: "Completado",
  },
  {
    id: "#ORD-2844",
    customer: "Luis Martín",
    product: "Plan Pro",
    amount: "€149",
    status: "Cancelado",
  },
  {
    id: "#ORD-2843",
    customer: "Elena Ruiz",
    product: "Plan Starter",
    amount: "€49",
    status: "Completado",
  },
] as const;

const statusStyles: Record<(typeof orders)[number]["status"], string> = {
  Completado: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  Pendiente: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  Cancelado: "bg-rose-500/10 text-rose-700 dark:text-rose-400",
};

export function RecentOrders() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="border-b border-border px-5 py-4">
        <h2 className="font-semibold text-card-foreground">Pedidos recientes</h2>
        <p className="text-sm text-muted">Últimas transacciones del sistema</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-foreground/[0.02] text-muted">
              <th className="px-5 py-3 font-medium">Pedido</th>
              <th className="px-5 py-3 font-medium">Cliente</th>
              <th className="px-5 py-3 font-medium">Producto</th>
              <th className="px-5 py-3 font-medium">Importe</th>
              <th className="px-5 py-3 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr
                key={order.id}
                className="border-b border-border last:border-0 hover:bg-foreground/[0.02]"
              >
                <td className="px-5 py-3.5 font-medium text-card-foreground">
                  {order.id}
                </td>
                <td className="px-5 py-3.5 text-card-foreground">
                  {order.customer}
                </td>
                <td className="px-5 py-3.5 text-muted">{order.product}</td>
                <td className="px-5 py-3.5 font-medium text-card-foreground">
                  {order.amount}
                </td>
                <td className="px-5 py-3.5">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles[order.status]}`}
                  >
                    {order.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
