import { redirect } from "next/navigation";

/** Los contratos se gestionan desde la ficha de cada empresa. */
export default function ContractsPage() {
  redirect("/branches");
}
