import { AdminShell } from "@/components/admin/admin-shell";
import { RoleGuard } from "@/components/auth/role-guard";
import { MqttTestPanel } from "@/components/mqtt/mqtt-test-panel";

export default function MqttTestsPage() {
  return (
    <AdminShell
      title="Pruebas MQTT"
      description="Monitor en vivo, diagnóstico de conexión, enajenación fiscal y publicación al broker"
    >
      <RoleGuard path="/mqtt-tests">
        <MqttTestPanel />
      </RoleGuard>
    </AdminShell>
  );
}
