import { AdminShell } from "@/components/admin/admin-shell";
import { RoleGuard } from "@/components/auth/role-guard";
import { ToolsMigrationPlaceholder } from "@/components/tools/tools-migration-placeholder";

export default function ToolsHomePage() {
  return (
    <AdminShell
      title="AEG Tools"
      description="Esqueleto inicial para migrar las operaciones de campo de AEG Tools dentro del panel web."
    >
      <RoleGuard path="/tools">
        <ToolsMigrationPlaceholder
          title="Dashboard de operaciones de campo"
          message="Esta ruta reemplazará el dashboard principal de AEG Tools con listado de impresoras, búsqueda y accesos a operaciones MQTT. En esta fase solo queda delimitado el esqueleto."
          moduleIds={[
            "tools-printers-dashboard",
            "tools-printers-table",
            "tools-shared-formatters",
            "tools-shared-api",
          ]}
        />
      </RoleGuard>
    </AdminShell>
  );
}
