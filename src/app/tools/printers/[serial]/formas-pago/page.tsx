import { AdminShell } from "@/components/admin/admin-shell";
import { RoleGuard } from "@/components/auth/role-guard";
import { ToolsMigrationPlaceholder } from "@/components/tools/tools-migration-placeholder";

export default function ToolsPrinterFormasPagoPage() {
  return (
    <AdminShell
      title="AEG Tools"
      description="Formas de pago dentro del espacio de migración de Tools."
    >
      <RoleGuard path="/tools">
        <ToolsMigrationPlaceholder
          title="Formas de pago"
          message="Esta ruta hospedará el panel de formas de pago y su integración MQTT cuando se dé estructura al módulo."
          moduleIds={["tools-formas-pago", "tools-mqtt-core"]}
        />
      </RoleGuard>
    </AdminShell>
  );
}
