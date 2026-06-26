import { redirect } from "next/navigation";

/** Legacy: los clientes del técnico se gestionan en Empresas (/branches). */
export default function ClientsPage() {
  redirect("/branches");
}
