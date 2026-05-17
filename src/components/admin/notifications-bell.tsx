"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  Bell,
  Building2,
  Check,
  CheckCheck,
  ClipboardCheck,
  FileDigit,
  FileText,
  Loader2,
  MapPin,
  Printer,
  RefreshCw,
  Settings2,
  Stamp,
  UserPlus,
  Wrench,
  X,
} from "lucide-react";
import { useNotifications } from "@/context/notifications-provider";
import type { NotificationKind } from "@/types/notification";
import { cn } from "@/lib/utils";

const TYPE_ICONS: Record<
  NotificationKind,
  { icon: typeof Bell; className: string }
> = {
  printer: {
    icon: Printer,
    className: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400",
  },
  company: {
    icon: Building2,
    className: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
  },
  branch: {
    icon: MapPin,
    className: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  },
  employee: {
    icon: UserPlus,
    className: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
  },
  seal: {
    icon: Stamp,
    className: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  },
  technical_service: {
    icon: Wrench,
    className: "bg-orange-500/15 text-orange-700 dark:text-orange-300",
  },
  annual_inspection: {
    icon: ClipboardCheck,
    className: "bg-teal-500/15 text-teal-700 dark:text-teal-300",
  },
  contract: {
    icon: FileText,
    className: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  },
  printer_model: {
    icon: FileDigit,
    className: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300",
  },
  system: {
    icon: Settings2,
    className: "bg-slate-500/15 text-slate-600 dark:text-slate-400",
  },
};

export function NotificationsBell() {
  const {
    items,
    unreadCount,
    loading,
    error,
    refresh,
    markRead,
    markAllRead,
    dismiss,
    acknowledgeSeen,
  } = useNotifications();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const rootRef = useRef<HTMLDivElement>(null);

  const visibleItems =
    filter === "unread" ? items.filter((n) => !n.read) : items;

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      void refresh();
    } else {
      acknowledgeSeen();
    }
  }

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        handleOpenChange(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") handleOpenChange(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => handleOpenChange(!open)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={
          unreadCount > 0
            ? `Notificaciones, ${unreadCount} sin leer`
            : "Notificaciones"
        }
        className={cn(
          "relative rounded-lg p-2 text-muted transition-colors hover:bg-foreground/5 hover:text-foreground",
          open && "bg-foreground/5 text-foreground",
        )}
      >
        <Bell className="size-5" />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex min-w-[18px] items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold leading-none text-accent-foreground ring-2 ring-background">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 lg:hidden"
            aria-label="Cerrar notificaciones"
            onClick={() => handleOpenChange(false)}
          />
          <div
            role="dialog"
            aria-label="Panel de notificaciones"
            className="absolute right-0 z-50 mt-2 w-[min(calc(100vw-1.5rem),22rem)] max-sm:fixed max-sm:right-3 max-sm:left-3 max-sm:w-auto overflow-hidden rounded-xl border border-border bg-card shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div>
                <h2 className="text-sm font-semibold text-card-foreground">
                  Notificaciones
                </h2>
                <p className="text-xs text-muted">
                  {loading
                    ? "Actualizando…"
                    : unreadCount > 0
                      ? `${unreadCount} sin leer`
                      : "Altas recientes en tu ámbito"}
                </p>
              </div>
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => void refresh()}
                  disabled={loading}
                  className="rounded-lg p-1.5 text-muted hover:bg-foreground/5 disabled:opacity-50"
                  aria-label="Actualizar notificaciones"
                  title="Actualizar"
                >
                  <RefreshCw
                    className={cn("size-4", loading && "animate-spin")}
                  />
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenChange(false)}
                  className="rounded-lg p-1.5 text-muted hover:bg-foreground/5"
                  aria-label="Cerrar"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>

            {error && (
              <p
                role="alert"
                className="border-b border-border bg-amber-500/10 px-4 py-2 text-xs text-amber-800 dark:text-amber-200"
              >
                {error}
              </p>
            )}

            <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
              <div className="flex gap-1 rounded-lg bg-foreground/[0.04] p-0.5">
                {(
                  [
                    ["all", "Todas"],
                    ["unread", "Sin leer"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setFilter(value)}
                    className={cn(
                      "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                      filter === value
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted hover:text-foreground",
                    )}
                  >
                    {label}
                    {value === "unread" && unreadCount > 0 && (
                      <span className="ml-1 text-accent">({unreadCount})</span>
                    )}
                  </button>
                ))}
              </div>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded-lg px-2 py-1 text-xs font-medium text-accent hover:bg-accent/10"
                >
                  <CheckCheck className="size-3.5" />
                  Leer todas
                </button>
              )}
            </div>

            <ul className="max-h-80 overflow-y-auto overscroll-contain py-1">
              {loading && items.length === 0 ? (
                <li className="flex items-center justify-center gap-2 px-4 py-12 text-sm text-muted">
                  <Loader2 className="size-4 animate-spin" />
                  Cargando…
                </li>
              ) : visibleItems.length === 0 ? (
                <li className="px-4 py-10 text-center">
                  <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-foreground/[0.04] text-muted">
                    <Check className="size-5" />
                  </div>
                  <p className="mt-3 text-sm font-medium text-card-foreground">
                    {filter === "unread"
                      ? "No tienes notificaciones sin leer"
                      : "No hay novedades recientes"}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    Mostramos altas de los últimos 14 días según tu rol.
                  </p>
                </li>
              ) : (
                visibleItems.map((item) => {
                  const meta = TYPE_ICONS[item.kind];
                  const Icon = meta.icon;
                  const body = (
                    <>
                      {!item.read && (
                        <span className="absolute left-1.5 top-1/2 size-1.5 -translate-y-1/2 rounded-full bg-accent" />
                      )}
                      <div
                        className={cn(
                          "flex size-9 shrink-0 items-center justify-center rounded-lg",
                          meta.className,
                        )}
                      >
                        <Icon className="size-4" />
                      </div>
                      <div className="min-w-0 flex-1 pr-6">
                        <p className="text-sm font-medium text-card-foreground">
                          {item.title}
                        </p>
                        <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted">
                          {item.message}
                        </p>
                        <p className="mt-1 text-[11px] text-muted">{item.time}</p>
                      </div>
                    </>
                  );

                  const rowClass = cn(
                    "group relative flex gap-3 px-4 py-3 transition-colors hover:bg-foreground/[0.03]",
                    !item.read && "bg-accent/[0.04]",
                  );

                  const actions = (
                    <div className="absolute right-2 top-2 flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                      {!item.read && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            markRead(item.id);
                          }}
                          className="rounded p-1 text-muted hover:bg-foreground/5 hover:text-foreground"
                          title="Marcar como leída"
                          aria-label="Marcar como leída"
                        >
                          <Check className="size-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          dismiss(item.id);
                        }}
                        className="rounded p-1 text-muted hover:bg-foreground/5 hover:text-foreground"
                        title="Descartar"
                        aria-label="Descartar notificación"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  );

                  if (item.href) {
                    return (
                      <li key={item.id}>
                        <Link
                          href={item.href}
                          onClick={() => {
                            if (!item.read) markRead(item.id);
                            handleOpenChange(false);
                          }}
                          className={rowClass}
                        >
                          {body}
                          {actions}
                        </Link>
                      </li>
                    );
                  }

                  return (
                    <li key={item.id}>
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => !item.read && markRead(item.id)}
                        onKeyDown={(e) => {
                          if (
                            (e.key === "Enter" || e.key === " ") &&
                            !item.read
                          ) {
                            e.preventDefault();
                            markRead(item.id);
                          }
                        }}
                        className={cn(rowClass, "cursor-pointer")}
                      >
                        {body}
                        {actions}
                      </div>
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
