import { AdminShell } from "@/components/admin/admin-shell";
import { RoleGuard } from "@/components/auth/role-guard";
import { ToolsPrintersManager } from "@/components/tools/tools-printers-manager";

export default function ToolsHomePage() {
  return (
    <AdminShell title="AEG Tools">
      <RoleGuard path="/tools">
        <ToolsPrintersManager />
      </RoleGuard>
    </AdminShell>
  );
}
