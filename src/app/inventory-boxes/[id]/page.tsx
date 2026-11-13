import { AdminShell } from "@/components/admin/admin-shell";
import { RoleGuard } from "@/components/auth/role-guard";
import { InventoryBoxView } from "@/components/inventory-boxes/inventory-box-view";

export default function InventoryBoxDetailPage() {
  return (
    <AdminShell
      title="Caja de inventario"
      description="Detalle de caja de inventario e impresoras asignadas"
    >
      <RoleGuard path="/inventory-boxes">
        <InventoryBoxView />
      </RoleGuard>
    </AdminShell>
  );
}
