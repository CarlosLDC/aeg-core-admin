import { AdminShell } from "@/components/admin/admin-shell";
import { RoleGuard } from "@/components/auth/role-guard";
import { UsersManager } from "@/components/users/users-manager";

export default function UsersPage() {
  return (
    <AdminShell
      title="Usuarios"
      description="Gestión de cuentas y roles (solo ADMIN)"
    >
      <RoleGuard path="/users">
        <UsersManager />
      </RoleGuard>
    </AdminShell>
  );
}
