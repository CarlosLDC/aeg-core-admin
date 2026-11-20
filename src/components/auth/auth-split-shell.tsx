"use client";

import type { ReactNode } from "react";
import { ThemeToggle } from "@/components/admin/theme-toggle";
import { LoginAnimatedBackdrop } from "@/components/auth/login-animated-backdrop";
import { BrandLogo } from "@/components/brand/logo";

type AuthSplitShellProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  footerNote?: string;
};

export function AuthSplitShell({
  title,
  subtitle,
  children,
  footerNote = "Impresoras, empresas y servicios en campo — un solo lugar para hacer crecer tu operación.",
}: AuthSplitShellProps) {
  return (
    <div className="relative flex min-h-screen bg-login-panel">
      <div className="absolute top-4 right-4 z-20 sm:top-6 sm:right-6">
        <ThemeToggle />
      </div>

      <div className="relative hidden flex-1 flex-col justify-between overflow-hidden p-10 text-sidebar-foreground lg:flex">
        <LoginAnimatedBackdrop />
        <div className="relative z-10">
          <BrandLogo variant="full" onDark href={null} priority />
        </div>
        <div className="relative z-10 max-w-md">
          <h1 className="text-3xl font-semibold tracking-tight text-sidebar-foreground drop-shadow-sm">
            El centro de mando de tu red fiscal
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-sidebar-muted">
            Visibilidad total sobre impresoras, empresas y equipos en campo.
            Menos fricción, más control — todo en un panel pensado para equipos
            que no se detienen.
          </p>
        </div>
        <p className="relative z-10 text-sm font-medium text-sidebar-foreground/90">
          Operaciones conectadas. Decisiones más rápidas.
        </p>
      </div>

      <div className="flex flex-1 items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md">
          <div className="mb-8 flex flex-col items-center lg:hidden">
            <BrandLogo variant="full" href={null} className="h-12" />
            <h2 className="mt-4 text-center text-2xl font-semibold tracking-tight">
              {title}
            </h2>
            <p className="mt-2 text-center text-sm text-muted">{subtitle}</p>
          </div>

          <div className="hidden lg:block">
            <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
            <p className="mt-2 text-sm text-muted">{subtitle}</p>
          </div>

          <div className="mt-8">{children}</div>

          <p className="mt-6 text-center text-xs text-muted">{footerNote}</p>
        </div>
      </div>
    </div>
  );
}
