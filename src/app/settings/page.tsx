import Link from "next/link";
import { Settings, Shield } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { RoleGuard } from "@/components/auth/role-guard";

const links = [
  {
    href: "/settings/permissions",
    title: "Matriz de permisos",
    description: "Consulta qué puede hacer cada rol en el panel.",
    icon: Shield,
  },
];

export default function SettingsPage() {
  return (
    <AdminShell title="Configuración" description="Preferencias del sistema">
      <RoleGuard path="/settings">
        <div className="admin-content-stack">
          <p className="text-sm text-muted">
            Ajustes del panel de administración. La asignación de roles a usuarios
            se gestiona en el backend.
          </p>
          <ul className="grid gap-4 sm:grid-cols-2">
            {links.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="flex gap-4 rounded-xl border border-border bg-card p-4 shadow-sm transition-colors hover:border-accent/40"
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                      <Icon className="size-5" aria-hidden />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-card-foreground">
                        {item.title}
                      </span>
                      <span className="mt-1 block text-sm text-muted">
                        {item.description}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
          <p className="flex items-center gap-2 text-xs text-muted">
            <Settings className="size-4 shrink-0" aria-hidden />
            Más preferencias (notificaciones, integraciones) próximamente.
          </p>
        </div>
      </RoleGuard>
    </AdminShell>
  );
}
