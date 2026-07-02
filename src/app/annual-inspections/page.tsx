import { AdminShell } from "@/components/admin/admin-shell";
import { RoleGuard } from "@/components/auth/role-guard";
import { AnnualInspectionsManager } from "@/components/annual-inspections/annual-inspections-manager";

export default function AnnualInspectionsPage() {
  return (
    <AdminShell
      title="Inspección anual"
      description="Revisiones anuales de impresoras fiscales"
    >
      <RoleGuard path="/annual-inspections">
        <AnnualInspectionsManager />
      </RoleGuard>
    </AdminShell>
  );
}
