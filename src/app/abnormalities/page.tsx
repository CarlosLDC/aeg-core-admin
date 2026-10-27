import { AbnormalitiesManager } from "@/components/abnormalities/abnormalities-manager";
import { AdminShell } from "@/components/admin/admin-shell";
import { RoleGuard } from "@/components/auth/role-guard";

export default function AbnormalitiesPage() {
  return (
    <AdminShell
      title="Anormalidades"
      description="Libro de control de anormalidades de máquinas fiscales (Art. 46 SENIAT)"
    >
      <RoleGuard path="/abnormalities">
        <AbnormalitiesManager />
      </RoleGuard>
    </AdminShell>
  );
}
