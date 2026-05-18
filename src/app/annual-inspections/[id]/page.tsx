import { AdminShell } from "@/components/admin/admin-shell";
import { RoleGuard } from "@/components/auth/role-guard";
import { AnnualInspectionView } from "@/components/annual-inspections/annual-inspection-view";

export default function AnnualInspectionDetailPage() {
  return (
    <AdminShell title="Inspección anual" description="Detalle de inspección">
      <RoleGuard path="/annual-inspections">
        <AnnualInspectionView />
      </RoleGuard>
    </AdminShell>
  );
}
