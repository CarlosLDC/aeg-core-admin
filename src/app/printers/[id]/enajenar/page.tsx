import { redirect } from "next/navigation";
import { printerPath, printersListPath } from "@/lib/resource-routes";

type PrinterDispositionPageProps = {
  params: Promise<{ id: string }>;
};

export default async function PrinterDispositionPage({
  params,
}: PrinterDispositionPageProps) {
  const { id } = await params;
  const printerId = Number(id);
  if (!Number.isInteger(printerId) || printerId <= 0) {
    redirect(printersListPath);
  }
  redirect(printerPath(printerId));
}
