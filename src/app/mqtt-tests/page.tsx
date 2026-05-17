import { AdminShell } from "@/components/admin/admin-shell";
import { RoleGuard } from "@/components/auth/role-guard";
import { MqttTestPanel } from "@/components/mqtt/mqtt-test-panel";

export default function MqttTestsPage() {
  return (
    <AdminShell
      title="Pruebas MQTT"
      description="Diagnóstico de conexión y publicación de mensajes al broker"
    >
      <RoleGuard path="/mqtt-tests">
        <MqttTestPanel />
      </RoleGuard>
    </AdminShell>
  );
}
