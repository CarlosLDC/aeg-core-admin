import { AdminShell } from "@/components/admin/admin-shell";
import { RoleGuard } from "@/components/auth/role-guard";
import { ToolsMigrationPlaceholder } from "@/components/tools/tools-migration-placeholder";

export default function ToolsPrinterReporteZPage() {
  return (
    <AdminShell
      title="AEG Tools"
      description="Reporte Z dentro del espacio de migración de Tools."
    >
      <RoleGuard path="/tools">
        <ToolsMigrationPlaceholder
          title="Reporte Z"
          message="Esta ruta reservará el flujo para consultar, transmitir y visualizar Reportes Z cuando se migre la capa MQTT."
          moduleIds={["tools-reporte-z", "tools-mqtt-core"]}
        />
      </RoleGuard>
    </AdminShell>
  );
}
