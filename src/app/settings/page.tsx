import { Settings } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { PagePlaceholder } from "@/components/admin/page-placeholder";
import { RoleGuard } from "@/components/auth/role-guard";

export default function SettingsPage() {
  return (
    <AdminShell
      title="Configuración"
      description="Preferencias del sistema"
    >
      <RoleGuard path="/settings">
      <PagePlaceholder
        icon={Settings}
        title="Configuración"
        description="Ajusta preferencias generales, integraciones y notificaciones del panel."
      />
      </RoleGuard>
    </AdminShell>
  );
}
