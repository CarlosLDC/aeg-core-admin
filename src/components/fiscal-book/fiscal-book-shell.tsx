"use client";

import Link from "next/link";
import { BookOpen } from "lucide-react";
import { AuthGuard } from "@/components/auth/auth-guard";
import { RouteAccessGuard } from "@/components/auth/route-access-guard";

export function FiscalBookShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <RouteAccessGuard>
        <div className="min-h-screen bg-background text-card-foreground">
          <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-md">
            <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
              <div className="flex items-center gap-2">
                <BookOpen className="size-5 text-accent" aria-hidden />
                <span className="text-sm font-semibold tracking-tight">
                  Libro fiscal virtual
                </span>
              </div>
              <nav className="flex items-center gap-4 text-sm">
                <Link
                  href="/fiscal-book/manual"
                  className="text-muted transition-colors hover:text-foreground"
                >
                  Manual
                </Link>
                <Link
                  href="/"
                  className="font-medium text-accent transition-colors hover:underline"
                >
                  Volver al panel
                </Link>
              </nav>
            </div>
          </header>
          {children}
        </div>
      </RouteAccessGuard>
    </AuthGuard>
  );
}
