import { redirect } from "next/navigation";
import { toolsPrinterHeaderFooterPath } from "@/lib/resource-routes";

type ToolsPrinterLegacyFooterPageProps = {
  params: Promise<{ serial: string }>;
};

export default async function ToolsPrinterLegacyFooterPage({
  params,
}: ToolsPrinterLegacyFooterPageProps) {
  const { serial } = await params;
  redirect(toolsPrinterHeaderFooterPath(decodeURIComponent(serial)));
}
