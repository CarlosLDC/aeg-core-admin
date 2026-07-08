"use client";

import { useParams } from "next/navigation";
import { ToolsPrinterDetailView } from "@/components/tools/tools-printer-detail-view";

export function ToolsPrinterDetailPageClient() {
  const params = useParams<{ serial: string }>();
  const serial = decodeURIComponent(params.serial ?? "");

  return <ToolsPrinterDetailView serial={serial} />;
}
