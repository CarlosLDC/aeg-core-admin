import { AdminShell } from "@/components/admin/admin-shell";
import { RoleGuard } from "@/components/auth/role-guard";
import { UsersPortalTabs } from "@/components/users/users-portal-tabs";

export default function UsersPage() {
  return (
    <AdminShell
      title="Usuarios"
      description="Gestión de cuentas del panel y del libro fiscal (solo administradores)"
    >
      <RoleGuard path="/users">
        <UsersPortalTabs />
      </RoleGuard>
    </AdminShell>
  );
}
