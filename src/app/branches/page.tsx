import { AdminShell } from "@/components/admin/admin-shell";
import { RoleGuard } from "@/components/auth/role-guard";
import { BranchesManager } from "@/components/branches/branches-manager";

export default function BranchesPage() {
  return (
    <AdminShell
      title="Sucursales"
      description="Sucursales por empresa y tipo de operación"
    >
      <RoleGuard path="/branches" redirectTo="/clients">
        <BranchesManager />
      </RoleGuard>
    </AdminShell>
  );
}
