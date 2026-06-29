import { AdminShell } from "@/components/admin/admin-shell";
import { RoleGuard } from "@/components/auth/role-guard";
import { MqttTestPanel } from "@/components/mqtt/mqtt-test-panel";

export default function MqttTestsPage() {
  return (
    <AdminShell
      title="Herramientas Remoto"
      description="Diagnóstico del broker, actividad de enajenación, inspección anual (libro fiscal) y pruebas fiscales Remoto"
    >
      <RoleGuard path="/remoto">
        <MqttTestPanel />
      </RoleGuard>
    </AdminShell>
  );
}
