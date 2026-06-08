import { FiscalBookShell } from "@/components/fiscal-book/fiscal-book-shell";
import "./fiscal-book-print.css";

export const metadata = {
  title: "Libro fiscal — AEG",
  description:
    "Libro virtual de control, reparación y mantenimiento de máquinas fiscales",
};

export default function FiscalBookLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <FiscalBookShell>{children}</FiscalBookShell>;
}
