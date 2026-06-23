import { FiscalBookHandoff } from "@/components/auth/fiscal-book-handoff";

type FiscalBookNestedPageProps = {
  params: Promise<{ path: string[] }>;
};

export default async function FiscalBookNestedPage({
  params,
}: FiscalBookNestedPageProps) {
  const { path } = await params;
  return <FiscalBookHandoff pathSegments={path} />;
}
