import { redirect } from "next/navigation";

type ClientReviewDetailPageProps = {
  params: { id: string };
};

export default function ClientReviewDetailPage({ params }: ClientReviewDetailPageProps) {
  redirect(`/reviews/clients/${params.id}`);
}
