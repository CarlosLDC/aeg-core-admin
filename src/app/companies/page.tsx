import { AdminShell } from "@/components/admin/admin-shell";
import { RoleGuard } from "@/components/auth/role-guard";
import { CompaniesManager } from "@/components/companies/companies-manager";

export default function CompaniesPage() {
  return (
    <AdminShell
      title="Empresas"
      description="Razón social, RIF y tipo de contribuyente"
    >
      <RoleGuard path="/companies">
        <CompaniesManager />
      </RoleGuard>
    </AdminShell>
  );
}
