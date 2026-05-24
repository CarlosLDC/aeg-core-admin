"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { BrandLogo } from "@/components/brand/logo";
import {
  isNavItemActive,
  navItemsForRole,
  navSectionsForRole,
  type NavItem,
} from "@/lib/navigation";
import { useAuth } from "@/context/auth-provider";
import { fetchClientModificationRequests } from "@/lib/client-modification-requests-api";
import { fetchEmployeeModificationRequests } from "@/lib/employee-modification-requests-api";
import {
  DEFAULT_POLL_INTERVAL_MS,
  DEFAULT_RETRY_DELAYS_MS,
  sleep,
} from "@/lib/polling";
import { cn } from "@/lib/utils";

const SIDEBAR_NAV_SCROLL_KEY = "aeg-admin-sidebar-nav-scroll";

/** Survives sidebar remounts on client-side route changes. */
let sidebarNavScrollTop = 0;

function readStoredNavScroll(): number {
  try {
    const raw = sessionStorage.getItem(SIDEBAR_NAV_SCROLL_KEY);
    if (raw != null) {
      const n = Number(raw);
      if (Number.isFinite(n) && n >= 0) return n;
    }
  } catch {
    /* private mode / quota */
  }
  return sidebarNavScrollTop;
}

function storeNavScroll(top: number) {
  sidebarNavScrollTop = top;
  try {
    sessionStorage.setItem(SIDEBAR_NAV_SCROLL_KEY, String(top));
  } catch {
    /* private mode / quota */
  }
}

type SidebarProps = {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
};

function NavRow({
  item,
  isActive,
  isCollapsed,
  badgeCount,
  onNavigate,
  onBeforeNavigate,
}: {
  item: NavItem;
  isActive: boolean;
  isCollapsed: boolean;
  badgeCount?: number;
  onNavigate?: () => void;
  onBeforeNavigate?: () => void;
}) {
  const Icon = item.icon;
  const rowClass = cn(
    "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
    isCollapsed && "justify-center px-2",
    item.disabled
      ? "cursor-default text-sidebar-muted/70"
      : isActive
        ? "bg-white/10 text-white"
        : "text-sidebar-muted hover:bg-white/5 hover:text-sidebar-foreground",
  );

  if (item.disabled) {
    return (
      <span
        title={isCollapsed ? item.title : undefined}
        aria-disabled="true"
        className={rowClass}
      >
        <Icon className="size-5 shrink-0 text-sidebar-muted/70" />
        {!isCollapsed && <span>{item.title}</span>}
      </span>
    );
  }

  return (
    <Link
      href={item.href}
      onClick={() => {
        onBeforeNavigate?.();
        onNavigate?.();
      }}
      title={isCollapsed ? item.title : undefined}
      className={rowClass}
    >
      <Icon
        className={cn(
          "size-5 shrink-0",
          isActive
            ? "text-accent"
            : "text-sidebar-muted group-hover:text-sidebar-foreground",
        )}
      />
      {!isCollapsed && <span>{item.title}</span>}
      {!isCollapsed && badgeCount != null && badgeCount > 0 && (
        <span className="ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[11px] font-semibold text-amber-200">
          {badgeCount}
        </span>
      )}
      {isActive && !isCollapsed && !(badgeCount != null && badgeCount > 0) && (
        <span className="ml-auto size-1.5 rounded-full bg-accent" />
      )}
    </Link>
  );
}

export function Sidebar({
  collapsed,
  onToggle,
  mobileOpen = false,
  onMobileClose,
}: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const isCollapsed = collapsed && !mobileOpen;
  const isMobileDrawer = mobileOpen;
  const sections = user ? navSectionsForRole(user.role) : [];
  const navItems = user ? navItemsForRole(user.role) : [];
  const navRef = useRef<HTMLElement>(null);
  const [pendingReviewCount, setPendingReviewCount] = useState(0);
  const [pendingClientReviewCount, setPendingClientReviewCount] = useState(0);

  const persistNavScroll = useCallback(() => {
    const el = navRef.current;
    if (!el) return;
    storeNavScroll(el.scrollTop);
  }, []);

  useLayoutEffect(() => {
    const el = navRef.current;
    if (!el) return;
    const top = readStoredNavScroll();
    if (top > 0) el.scrollTop = top;
  }, [pathname, sections.length]);

  useEffect(() => {
    const el = navRef.current;
    if (!el) return;
    const onScroll = () => storeNavScroll(el.scrollTop);
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [sections.length]);

  useEffect(() => {
    if (user?.role !== "ADMIN") {
      setPendingReviewCount(0);
      setPendingClientReviewCount(0);
      return;
    }
    let cancelled = false;
    let running = false;

    const loadPending = async () => {
      try {
        const pending = await fetchEmployeeModificationRequests("PENDING");
        const pendingClients = await fetchClientModificationRequests("PENDING");
        if (!cancelled) setPendingReviewCount(pending.length);
        if (!cancelled) setPendingClientReviewCount(pendingClients.length);
        return true;
      } catch {
        return false;
      }
    };

    const pollPending = async () => {
      if (cancelled || running || document.visibilityState !== "visible") return;
      running = true;
      try {
        let ok = await loadPending();
        if (ok) return;
        for (const delay of DEFAULT_RETRY_DELAYS_MS) {
          if (cancelled || document.visibilityState !== "visible") return;
          await sleep(delay);
          if (cancelled || document.visibilityState !== "visible") return;
          ok = await loadPending();
          if (ok) return;
        }
      } finally {
        running = false;
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void pollPending();
      }
    };

    void pollPending();
    const intervalId = window.setInterval(() => {
      void pollPending();
    }, DEFAULT_POLL_INTERVAL_MS);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.clearInterval(intervalId);
    };
  }, [pathname, user?.role]);

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 flex flex-col border-r border-white/10 bg-sidebar text-sidebar-foreground transition-[width,transform] duration-300 ease-out",
        isCollapsed ? "lg:w-[72px]" : "lg:w-64",
        isMobileDrawer
          ? "max-lg:w-[min(17rem,calc(100vw-2.5rem))] max-lg:translate-x-0 max-lg:shadow-2xl"
          : "max-lg:pointer-events-none max-lg:-translate-x-full",
        "lg:translate-x-0",
      )}
    >
      <div
        className={cn(
          "flex h-16 shrink-0 items-center border-b border-white/10",
          isMobileDrawer
            ? "gap-2 px-3"
            : isCollapsed
              ? "justify-center px-0"
              : "gap-2 px-3",
        )}
      >
        <BrandLogo
          variant={isCollapsed && !isMobileDrawer ? "mark" : "full"}
          onDark
          href="/"
          priority
          centered={isCollapsed && !isMobileDrawer}
        />
        {isMobileDrawer && onMobileClose && (
          <button
            type="button"
            onClick={onMobileClose}
            className="ml-auto shrink-0 rounded-lg p-1.5 text-sidebar-muted hover:bg-white/5 hover:text-white lg:hidden"
            aria-label="Cerrar menú"
          >
            <X className="size-5" />
          </button>
        )}
      </div>

      <nav
        ref={navRef}
        className="sidebar-nav-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain p-3"
      >
        {sections.map((section, sectionIndex) => (
          <div
            key={section.title}
            className={cn(sectionIndex > 0 && "mt-5")}
            aria-label={section.title}
          >
            {!isCollapsed || isMobileDrawer ? (
              <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-sidebar-muted/80">
                {section.title}
              </p>
            ) : (
              sectionIndex > 0 && (
                <div
                  className="mx-auto mb-2 h-px w-8 bg-white/10"
                  aria-hidden
                />
              )
            )}
            <ul className="space-y-1">
              {section.items.map((item) => (
                <li key={item.href}>
                  <NavRow
                    item={item}
                    isActive={isNavItemActive(item, pathname, navItems)}
                    isCollapsed={isCollapsed && !isMobileDrawer}
                    badgeCount={
                      item.href === "/employees/reviews"
                        ? pendingReviewCount
                        : item.href === "/clients/reviews"
                          ? pendingClientReviewCount
                          : undefined
                    }
                    onBeforeNavigate={persistNavScroll}
                    onNavigate={onMobileClose}
                  />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {isMobileDrawer && onMobileClose ? (
        <div className="shrink-0 border-t border-white/10 p-3 lg:hidden">
          <button
            type="button"
            onClick={onMobileClose}
            className="flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium text-sidebar-muted transition-colors hover:bg-white/5 hover:text-sidebar-foreground"
          >
            <ChevronLeft className="size-5" />
            Cerrar menú
          </button>
        </div>
      ) : null}

      <div className="hidden shrink-0 border-t border-white/10 px-2 py-3 lg:block">
        <button
          type="button"
          onClick={onToggle}
          className={cn(
            "flex w-full items-center rounded-lg py-2 text-sm text-sidebar-muted transition-colors hover:bg-white/5 hover:text-sidebar-foreground",
            isCollapsed
              ? "justify-center px-0"
              : "justify-start gap-2 pl-3 pr-2",
          )}
          aria-label={isCollapsed ? "Expandir menú" : "Contraer menú"}
        >
          {isCollapsed ? (
            <ChevronRight className="size-5 shrink-0" />
          ) : (
            <>
              <ChevronLeft className="size-5 shrink-0" />
              <span>Contraer</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
