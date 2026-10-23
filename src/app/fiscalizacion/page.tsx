import { AdminShell } from "@/components/admin/admin-shell";
import { RoleGuard } from "@/components/auth/role-guard";
import { FiscalizacionUsbWizard } from "@/modules/fiscalizacion/FiscalizacionUsbWizard";

export default function FiscalizacionPage() {
  return (
    <AdminShell
      title="Fiscalización USB"
      description="Alta y provisión de impresoras nuevas por USB: configuración Wi-Fi, broker nuevo, precinto y fiscalización"
    >
      <RoleGuard path="/fiscalizacion">
        <FiscalizacionUsbWizard />
      </RoleGuard>
    </AdminShell>
  );
}
