import { AdminShell } from "@/components/admin/admin-shell";
import { RoleGuard } from "@/components/auth/role-guard";
import { FirmwareVersionView } from "@/components/firmware-versions/firmware-version-view";

export default function FirmwareVersionDetailPage() {
  return (
    <AdminShell
      title="Versión de firmware"
      description="Detalle de binario OTA"
    >
      <RoleGuard path="/firmware-versions">
        <FirmwareVersionView />
      </RoleGuard>
    </AdminShell>
  );
}
