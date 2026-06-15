"use client";

import { AuthGuard } from "@/components/auth/auth-guard";
import { RouteAccessGuard } from "@/components/auth/route-access-guard";

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <RouteAccessGuard>
        <div className="min-h-screen bg-background text-foreground">{children}</div>
      </RouteAccessGuard>
    </AuthGuard>
  );
}
