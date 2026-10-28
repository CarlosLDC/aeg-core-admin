import { AdminShell } from "@/components/admin/admin-shell";
import { RoleGuard } from "@/components/auth/role-guard";
import { SoftwareView } from "@/components/software/software-view";

export default function SoftwareDetailPage() {
  return (
    <AdminShell
      title="Software"
      description="Detalle del programa y distribuidores autorizados"
    >
      <RoleGuard path="/software">
        <SoftwareView />
      </RoleGuard>
    </AdminShell>
  );
}
