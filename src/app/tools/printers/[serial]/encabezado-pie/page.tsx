import { redirect } from "next/navigation";
import { toolsPrinterHeaderPath } from "@/lib/resource-routes";

type ToolsPrinterLegacyHeaderFooterPageProps = {
  params: Promise<{ serial: string }>;
};

export default async function ToolsPrinterLegacyHeaderFooterPage({
  params,
}: ToolsPrinterLegacyHeaderFooterPageProps) {
  const { serial } = await params;
  redirect(toolsPrinterHeaderPath(decodeURIComponent(serial)));
}
