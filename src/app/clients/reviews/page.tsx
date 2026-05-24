import { redirect } from "next/navigation";

export default function ClientReviewsPage() {
  redirect("/reviews?section=clients");
}
