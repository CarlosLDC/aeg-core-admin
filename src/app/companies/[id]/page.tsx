import { AdminShell } from "@/components/admin/admin-shell";
import { RoleGuard } from "@/components/auth/role-guard";
import { CompanyView } from "@/components/companies/company-view";

export default function CompanyDetailPage() {
  return (
    <AdminShell title="Empresa" description="Detalle de empresa">
      <RoleGuard path="/companies">
        <CompanyView />
      </RoleGuard>
    </AdminShell>
  );
}
