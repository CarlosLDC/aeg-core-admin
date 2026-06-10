"use client";

import { Suspense, useCallback, useState } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { RoleGuard } from "@/components/auth/role-guard";
import { PrinterDispositionView } from "@/components/printers/printer-disposition-view";
import { printerDispositionReviewTitle } from "@/lib/printer-form";
import type { PrinterResponse } from "@/types/printer";

export default function PrinterDispositionPage() {
  const [title, setTitle] = useState("Enajenar impresora");

  const handlePrinterLoaded = useCallback((printer: PrinterResponse) => {
    setTitle(printerDispositionReviewTitle(printer.fiscalSerial));
  }, []);

  return (
    <AdminShell title={title}>
      <RoleGuard path="/printers">
        <Suspense fallback={null}>
          <PrinterDispositionView onPrinterLoaded={handlePrinterLoaded} />
        </Suspense>
      </RoleGuard>
    </AdminShell>
  );
}
