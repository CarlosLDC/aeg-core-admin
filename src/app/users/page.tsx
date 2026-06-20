import { AdminShell } from "@/components/admin/admin-shell";
import { RoleGuard } from "@/components/auth/role-guard";
import { UsersManager } from "@/components/users/users-manager";

export default function UsersPage() {
  return (
    <AdminShell
      title="Usuarios"
      description="Catálogo unificado de cuentas: panel administrativo, operación de campo y auditores SENIAT del libro fiscal."
    >
      <RoleGuard path="/users">
        <UsersManager />
      </RoleGuard>
    </AdminShell>
  );
}
