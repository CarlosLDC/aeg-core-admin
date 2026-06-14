import { AdminShell } from "@/components/admin/admin-shell";
import { RoleGuard } from "@/components/auth/role-guard";
import { MqttTestPanel } from "@/components/mqtt/mqtt-test-panel";

export default function MqttTestsPage() {
  return (
    <AdminShell
      title="Herramientas MQTT"
      description="Monitor en vivo, diagnóstico del broker y prueba de enajenación fiscal"
    >
      <RoleGuard path="/mqtt-tests">
        <MqttTestPanel />
      </RoleGuard>
    </AdminShell>
  );
}
