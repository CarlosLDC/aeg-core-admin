import { redirect } from "next/navigation";
import { employeeModificationReviewPath } from "@/lib/resource-routes";

type EmployeeReviewDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EmployeeReviewDetailPage({
  params,
}: EmployeeReviewDetailPageProps) {
  const { id } = await params;
  const requestId = Number.parseInt(id, 10);
  if (!Number.isFinite(requestId) || requestId <= 0) {
    redirect("/reviews?section=employees");
  }
  redirect(employeeModificationReviewPath(requestId));
}
