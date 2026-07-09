"use client";

import Link from "next/link";
import { LogOut, Menu, ArrowLeft } from "lucide-react";
import { ThemeToggle } from "@/components/admin/theme-toggle";
import { NotificationsBell } from "@/components/admin/notifications-bell";
import { useAdminBackLink } from "@/components/admin/admin-back-link";
import { useAuth } from "@/context/auth-provider";
import { ROLE_LABELS } from "@/lib/roles";
import { cn } from "@/lib/utils";

type HeaderProps = {
  title: string;
  description?: string;
  onMenuClick: () => void;
  sidebarCollapsed?: boolean;
};

export function Header({
  title,
  description,
  onMenuClick,
  sidebarCollapsed = false,
}: HeaderProps) {
  const { user, logout } = useAuth();
  const backLink = useAdminBackLink();

  return (
    <header
      className={cn(
        "fixed top-0 right-0 z-30 border-b border-border bg-background/95 backdrop-blur-md transition-[left] duration-300 ease-out supports-[backdrop-filter]:bg-background/80",
        "left-0",
        sidebarCollapsed ? "lg:left-[72px]" : "lg:left-64",
      )}
    >
      <div
        className={cn(
          "flex items-center gap-2 px-3 sm:gap-4 sm:px-6 lg:px-8",
          backLink ? "min-h-16 py-2 sm:min-h-[4.5rem]" : "h-14 sm:h-16",
        )}
      >
        <button
          type="button"
          onClick={onMenuClick}
          className="shrink-0 self-center rounded-lg p-2 text-muted transition-colors hover:bg-foreground/5 hover:text-foreground lg:hidden"
          aria-label="Abrir menú"
        >
          <Menu className="size-5" />
        </button>

        <div className="min-w-0 flex-1 self-center">
          {backLink ? (
            <Link
              href={backLink.href}
              className="mb-1 inline-flex max-w-full items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-foreground"
            >
              <ArrowLeft className="size-4 shrink-0" aria-hidden />
              <span className="truncate">{backLink.label}</span>
            </Link>
          ) : null}
          <h1 className="truncate text-base font-semibold tracking-tight text-foreground sm:text-lg">
            {title}
          </h1>
          {description && (
            <p className="truncate text-xs text-muted md:hidden">
              {description}
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1 self-center sm:gap-2">
          <ThemeToggle />
          <NotificationsBell />

          <div className="flex items-center gap-1 rounded-lg border border-border bg-card py-1 pl-1 pr-1 sm:gap-2 sm:py-1.5 sm:pl-1.5 sm:pr-2">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-indigo-500 to-violet-600 text-xs font-semibold text-white">
              {user?.initials ?? "?"}
            </div>
            <div className="hidden min-w-0 sm:block">
              <p className="max-w-[120px] truncate text-sm font-medium text-foreground lg:max-w-[140px]">
                {user?.displayName ?? "—"}
              </p>
              <p className="truncate text-xs text-muted">
                {user?.role ? ROLE_LABELS[user.role] : "Conectado"}
              </p>
            </div>
            <button
              type="button"
              onClick={logout}
              className="shrink-0 rounded-lg p-2 text-muted transition-colors hover:bg-foreground/5 hover:text-foreground"
              aria-label="Cerrar sesión"
              title="Cerrar sesión"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
