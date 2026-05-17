import { AdminShell } from "@/components/admin/admin-shell";
import { RoleGuard } from "@/components/auth/role-guard";
import { SealsManager } from "@/components/seals/seals-manager";

export default function SealsPage() {
  return (
    <AdminShell
      title="Precintos fiscales"
      description="Control de precintos por serial, color y asignación a impresora"
    >
      <RoleGuard path="/seals">
        <SealsManager />
      </RoleGuard>
    </AdminShell>
  );
}
