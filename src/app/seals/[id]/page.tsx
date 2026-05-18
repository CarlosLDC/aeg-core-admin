import { AdminShell } from "@/components/admin/admin-shell";
import { RoleGuard } from "@/components/auth/role-guard";
import { SealView } from "@/components/seals/seal-view";

export default function SealDetailPage() {
  return (
    <AdminShell title="Precinto" description="Detalle de precinto fiscal">
      <RoleGuard path="/seals">
        <SealView />
      </RoleGuard>
    </AdminShell>
  );
}
