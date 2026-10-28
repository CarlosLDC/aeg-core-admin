import { AdminShell } from "@/components/admin/admin-shell";
import { RoleGuard } from "@/components/auth/role-guard";
import { SoftwareManager } from "@/components/software/software-manager";

export default function SoftwarePage() {
  return (
    <AdminShell
      title="Softwares y distribuidores"
      description="Programas de computación y facturación utilizados para la emisión fiscal (Art. 46 h SENIAT)"
    >
      <RoleGuard path="/software">
        <SoftwareManager />
      </RoleGuard>
    </AdminShell>
  );
}
