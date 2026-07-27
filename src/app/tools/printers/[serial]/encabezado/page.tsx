import { redirect } from "next/navigation";
import { toolsPrinterHeaderFooterPath } from "@/lib/resource-routes";

type ToolsPrinterLegacyHeaderPageProps = {
  params: Promise<{ serial: string }>;
};

export default async function ToolsPrinterLegacyHeaderPage({
  params,
}: ToolsPrinterLegacyHeaderPageProps) {
  const { serial } = await params;
  redirect(toolsPrinterHeaderFooterPath(decodeURIComponent(serial)));
}
