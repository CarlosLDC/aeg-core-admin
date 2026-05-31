import { redirect } from "next/navigation";

/** Detalle legacy de empresa fiscal: redirige al listado unificado. */
export default function CompanyDetailPage() {
  redirect("/branches");
}
