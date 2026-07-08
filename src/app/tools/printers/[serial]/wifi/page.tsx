import { AdminShell } from "@/components/admin/admin-shell";
import { RoleGuard } from "@/components/auth/role-guard";
import { ToolsMigrationPlaceholder } from "@/components/tools/tools-migration-placeholder";

export default function ToolsPrinterWifiPage() {
  return (
    <AdminShell
      title="AEG Tools"
      description="Configuración WiFi de impresoras dentro del espacio Tools."
    >
      <RoleGuard path="/tools">
        <ToolsMigrationPlaceholder
          title="Configuración WiFi"
          message="Esta ruta alojará la configuración WiFi y sus comandos MQTT cuando se porte la estructura funcional."
          moduleIds={["tools-wifi", "tools-mqtt-core"]}
        />
      </RoleGuard>
    </AdminShell>
  );
}
