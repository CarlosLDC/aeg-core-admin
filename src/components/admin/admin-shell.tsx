"use client";

import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { AuthGuard } from "@/components/auth/auth-guard";
import { RouteAccessGuard } from "@/components/auth/route-access-guard";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { cn } from "@/lib/utils";

const SIDEBAR_COLLAPSED_KEY = "aeg-admin-sidebar-collapsed";

/** Survives AdminShell remounts on client-side route changes. */
let sidebarCollapsedMemory: boolean | null = null;

function readCollapsedPreference(): boolean {
  if (sidebarCollapsedMemory !== null) return sidebarCollapsedMemory;
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    const value = raw === "1";
    sidebarCollapsedMemory = value;
    return value;
  } catch {
    return false;
  }
}

function persistCollapsedPreference(collapsed: boolean) {
  sidebarCollapsedMemory = collapsed;
  try {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? "1" : "0");
  } catch {
    /* private mode / quota */
  }
}

function initialCollapsedState(): boolean {
  return sidebarCollapsedMemory ?? false;
}

type AdminShellProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
};

export function AdminShell({ title, description, children }: AdminShellProps) {
  const [collapsed, setCollapsed] = useState(initialCollapsedState);
  const [mobileOpen, setMobileOpen] = useState(false);

  useLayoutEffect(() => {
    const preferred = readCollapsedPreference();
    setCollapsed((current) => (current === preferred ? current : preferred));
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((current) => {
      const next = !current;
      persistCollapsedPreference(next);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    function onChange() {
      if (mq.matches) setMobileOpen(false);
    }
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return (
    <AuthGuard>
      <RouteAccessGuard>
      <div className="min-h-screen bg-background">
        {mobileOpen && (
          <button
            type="button"
            className="fixed inset-0 z-30 bg-black/50 lg:hidden"
            aria-label="Cerrar menú"
            onClick={() => setMobileOpen(false)}
          />
        )}

        <Sidebar
          collapsed={collapsed}
          onToggle={toggleCollapsed}
          mobileOpen={mobileOpen}
          onMobileClose={() => setMobileOpen(false)}
        />

        <div
          className={cn(
            "min-w-0 transition-[padding] duration-300 ease-out",
            collapsed ? "lg:pl-[72px]" : "lg:pl-64",
          )}
        >
          <Header
            title={title}
            description={description}
            onMenuClick={() => setMobileOpen(true)}
            sidebarCollapsed={collapsed}
          />
          <main className="min-w-0 px-3 pb-3 pt-[var(--admin-header-offset)] sm:px-6 sm:pb-6 lg:px-8 lg:pb-8">
            <div className="pt-[var(--admin-content-gap)]">{children}</div>
          </main>
        </div>
      </div>
      </RouteAccessGuard>
    </AuthGuard>
  );
}
