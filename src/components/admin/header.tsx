"use client";

import { LogOut, Menu } from "lucide-react";
import { useAuth } from "@/context/auth-provider";
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
      <div className="flex h-16 items-center gap-4 px-4 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={onMenuClick}
          className="rounded-lg p-2 text-muted transition-colors hover:bg-foreground/5 hover:text-foreground lg:hidden"
          aria-label="Abrir menú"
        >
          <Menu className="size-5" />
        </button>

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-semibold tracking-tight text-foreground">
            {title}
          </h1>
          {description && (
            <p className="hidden truncate text-sm text-muted sm:block">
              {description}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <NotificationsBell />

          <div className="flex items-center gap-2 rounded-lg border border-border bg-card py-1.5 pl-1.5 pr-2">
            <div className="flex size-8 items-center justify-center rounded-md bg-gradient-to-br from-indigo-500 to-violet-600 text-xs font-semibold text-white">
              {user?.initials ?? "?"}
            </div>
            <div className="hidden sm:block">
              <p className="max-w-[140px] truncate text-sm font-medium text-foreground">
                {user?.username ?? "—"}
              </p>
              <p className="text-xs text-muted">Sesión JWT</p>
            </div>
            <button
              type="button"
              onClick={logout}
              className="rounded-lg p-2 text-muted transition-colors hover:bg-foreground/5 hover:text-foreground"
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
