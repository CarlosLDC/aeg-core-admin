import { redirect } from "next/navigation";

type EmployeeReviewDetailPageProps = {
  params: { id: string };
};

export default function EmployeeReviewDetailPage({
  params,
}: EmployeeReviewDetailPageProps) {
  redirect(`/reviews/employees/${params.id}`);
}
