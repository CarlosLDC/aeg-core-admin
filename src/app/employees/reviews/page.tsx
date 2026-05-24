import { redirect } from "next/navigation";

export default function EmployeeReviewsPage() {
  redirect("/reviews?section=employees");
}
