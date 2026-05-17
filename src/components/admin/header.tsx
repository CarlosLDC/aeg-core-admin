"use client";

import { LogOut, Menu } from "lucide-react";
import { useAuth } from "@/context/auth-provider";
import { ROLE_LABELS } from "@/lib/roles";
import { NotificationsBell } from "@/components/admin/notifications-bell";

type HeaderProps = {
  title: string;
  description?: string;
  onMenuClick: () => void;
};

export function Header({ title, description, onMenuClick }: HeaderProps) {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="flex h-14 items-center gap-2 px-3 sm:h-16 sm:gap-4 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={onMenuClick}
          className="shrink-0 rounded-lg p-2 text-muted transition-colors hover:bg-foreground/5 hover:text-foreground lg:hidden"
          aria-label="Abrir menú"
        >
          <Menu className="size-5" />
        </button>

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-semibold tracking-tight text-foreground sm:text-lg">
            {title}
          </h1>
          {description && (
            <p className="truncate text-xs text-muted md:hidden">
              {description}
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <NotificationsBell />

          <div className="flex items-center gap-1 rounded-lg border border-border bg-card py-1 pl-1 pr-1 sm:gap-2 sm:py-1.5 sm:pl-1.5 sm:pr-2">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-indigo-500 to-violet-600 text-xs font-semibold text-white">
              {user?.initials ?? "?"}
            </div>
            <div className="hidden min-w-0 sm:block">
              <p className="max-w-[120px] truncate text-sm font-medium text-foreground lg:max-w-[140px]">
                {user?.username ?? "—"}
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
