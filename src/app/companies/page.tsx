import { redirect } from "next/navigation";

/** Catálogo legacy: las empresas se gestionan en /branches. */
export default function CompaniesPage() {
  redirect("/branches");
}
