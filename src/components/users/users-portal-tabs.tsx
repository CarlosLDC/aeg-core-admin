"use client";

import { useState } from "react";
import { FiscalBookUsersManager } from "@/components/users/fiscal-book-users-manager";
import { UsersManager } from "@/components/users/users-manager";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import { cn } from "@/lib/utils";

type UsersPortal = "panel" | "fiscal-book";

export function UsersPortalTabs() {
  const [portal, setPortal] = useState<UsersPortal>("panel");

  return (
    <div className="space-y-6">
      <SegmentedToggle
        value={portal}
        onChange={setPortal}
        ariaLabel="Tipo de usuarios"
        options={[
          { value: "panel", label: "Usuarios del panel" },
          { value: "fiscal-book", label: "Usuarios del libro fiscal" },
        ]}
        className="max-w-xl"
      />
      <p className="text-sm text-muted">
        {portal === "panel"
          ? "Cuentas de aeg-core-admin (ADMIN, DISTRIBUTOR, TECHNICIAN, SERVICE_CENTER)."
          : "Cuentas exclusivas de aeg-libros-fiscales (FISCAL_ADMIN, FISCAL_TECHNICIAN, FISCAL_AUDITOR)."}
      </p>
      <div className={cn(portal !== "panel" && "hidden")}>
        <UsersManager />
      </div>
      <div className={cn(portal !== "fiscal-book" && "hidden")}>
        <FiscalBookUsersManager />
      </div>
    </div>
  );
}
