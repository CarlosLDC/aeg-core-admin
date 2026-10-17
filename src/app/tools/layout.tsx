import { ToolsSectionProvider } from "@/modules/tools";

export default function ToolsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ToolsSectionProvider>{children}</ToolsSectionProvider>;
}
