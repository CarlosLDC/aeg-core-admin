import { AdminShell } from "@/components/admin/admin-shell";
import { RoleGuard } from "@/components/auth/role-guard";
import { UserView } from "@/components/users/user-view";

export default function UserDetailPage() {
  return (
    <AdminShell
      title="Usuario"
      description="Detalle de cuenta, portales habilitados y alcance operativo"
    >
      <RoleGuard path="/users">
        <UserView />
      </RoleGuard>
    </AdminShell>
  );
}
