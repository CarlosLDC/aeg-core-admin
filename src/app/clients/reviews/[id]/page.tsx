import { redirect } from "next/navigation";
import { clientModificationReviewPath } from "@/lib/resource-routes";

type ClientReviewDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ClientReviewDetailPage({
  params,
}: ClientReviewDetailPageProps) {
  const { id } = await params;
  const requestId = Number.parseInt(id, 10);
  if (!Number.isFinite(requestId) || requestId <= 0) {
    redirect("/reviews?section=clients");
  }
  redirect(clientModificationReviewPath(requestId));
}
