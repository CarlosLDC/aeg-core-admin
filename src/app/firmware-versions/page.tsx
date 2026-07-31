import { AdminShell } from "@/components/admin/admin-shell";
import { RoleGuard } from "@/components/auth/role-guard";
import { FirmwareVersionsManager } from "@/components/firmware-versions/firmware-versions-manager";

export default function FirmwareVersionsPage() {
  return (
    <AdminShell
      title="Versiones de firmware"
      description="Catálogo de binarios OTA para impresoras fiscales"
    >
      <RoleGuard path="/firmware-versions">
        <FirmwareVersionsManager />
      </RoleGuard>
    </AdminShell>
  );
}
