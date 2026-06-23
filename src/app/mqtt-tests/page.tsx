import { AdminShell } from "@/components/admin/admin-shell";
import { RoleGuard } from "@/components/auth/role-guard";
import { MqttTestPanel } from "@/components/mqtt/mqtt-test-panel";

export default function MqttTestsPage() {
  return (
    <AdminShell
      title="Herramientas MQTT"
      description="Diagnóstico del broker, actividad de enajenación y pruebas fiscales MQTT"
    >
      <RoleGuard path="/mqtt-tests">
        <MqttTestPanel />
      </RoleGuard>
    </AdminShell>
  );
}
