"use client";

import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  Building2,
  Check,
  CheckCheck,
  MapPin,
  Settings2,
  UserPlus,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NotificationType = "user" | "branch" | "company" | "system";

type NotificationItem = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  time: string;
  read: boolean;
};

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "1",
    type: "user",
    title: "Nuevo usuario",
    message: "Se registró test.user@aeg.local con rol Distribuidor.",
    time: "Hace 12 min",
    read: false,
  },
  {
    id: "2",
    type: "branch",
    title: "Sucursal actualizada",
    message: "Cambios en la sucursal Madrid, ES de Alpha Engineer Group.",
    time: "Hace 1 h",
    read: false,
  },
  {
    id: "3",
    type: "company",
    title: "Empresa creada",
    message: "Nueva empresa con RIF J123456789 añadida al catálogo.",
    time: "Hace 3 h",
    read: true,
  },
  {
    id: "4",
    type: "system",
    title: "Mantenimiento programado",
    message: "El API estará en mantenimiento el domingo 02:00–04:00 UTC.",
    time: "Ayer",
    read: true,
  },
];

const TYPE_ICONS: Record<
  NotificationType,
  { icon: typeof Bell; className: string }
> = {
  user: {
    icon: UserPlus,
    className: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
  },
  branch: {
    icon: MapPin,
    className: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  },
  company: {
    icon: Building2,
    className: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
  },
  system: {
    icon: Settings2,
    className: "bg-slate-500/15 text-slate-600 dark:text-slate-400",
  },
};

const HIDDEN_STORAGE_KEY = "aeg-admin-notifications-hidden";
const READ_PENDING_KEY = "aeg-admin-notifications-read-pending";
const LAST_PATH_KEY = "aeg-admin-notifications-last-path";

function loadIdSet(key: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function persistIdSet(key: string, ids: Set<string>) {
  sessionStorage.setItem(key, JSON.stringify([...ids]));
}

function loadHiddenIds() {
  return loadIdSet(HIDDEN_STORAGE_KEY);
}

function loadReadPendingIds() {
  return loadIdSet(READ_PENDING_KEY);
}

function hideNotificationIds(ids: string[]) {
  if (ids.length === 0) return;
  const hidden = loadHiddenIds();
  for (const id of ids) hidden.add(id);
  persistIdSet(HIDDEN_STORAGE_KEY, hidden);
}

function clearReadPendingIds() {
  sessionStorage.removeItem(READ_PENDING_KEY);
}

function buildVisibleNotifications(): NotificationItem[] {
  const hidden = loadHiddenIds();
  const readPending = loadReadPendingIds();
  return INITIAL_NOTIFICATIONS.filter((n) => !hidden.has(n.id)).map((n) => ({
    ...n,
    read: readPending.has(n.id) ? true : n.read,
  }));
}

function syncNotificationsForPath(pathname: string) {
  const lastPath = sessionStorage.getItem(LAST_PATH_KEY);
  if (lastPath && lastPath !== pathname) {
    const readIds = buildVisibleNotifications()
      .filter((n) => n.read)
      .map((n) => n.id);
    hideNotificationIds(readIds);
    clearReadPendingIds();
  }
  sessionStorage.setItem(LAST_PATH_KEY, pathname);
  return buildVisibleNotifications();
}

export function NotificationsBell() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [items, setItems] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const rootRef = useRef<HTMLDivElement>(null);

  const unreadCount = useMemo(
    () => items.filter((n) => !n.read).length,
    [items],
  );

  const visibleItems = useMemo(() => {
    if (filter === "unread") return items.filter((n) => !n.read);
    return items;
  }, [items, filter]);

  useEffect(() => {
    setItems(syncNotificationsForPath(pathname));
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function markRead(id: string) {
    const pending = loadReadPendingIds();
    pending.add(id);
    persistIdSet(READ_PENDING_KEY, pending);
    setItems((current) =>
      current.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  }

  function markAllRead() {
    const pending = loadReadPendingIds();
    for (const item of items) {
      if (!item.read) pending.add(item.id);
    }
    persistIdSet(READ_PENDING_KEY, pending);
    setItems((current) => current.map((n) => ({ ...n, read: true })));
  }

  function dismiss(id: string) {
    hideNotificationIds([id]);
    setItems((current) => current.filter((n) => n.id !== id));
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
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
        <div
          role="dialog"
          aria-label="Panel de notificaciones"
          className="absolute right-0 z-50 mt-2 w-[min(100vw-2rem,22rem)] overflow-hidden rounded-xl border border-border bg-card shadow-xl"
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div>
              <h2 className="text-sm font-semibold text-card-foreground">
                Notificaciones
              </h2>
              {unreadCount > 0 && (
                <p className="text-xs text-muted">{unreadCount} sin leer</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg p-1.5 text-muted hover:bg-foreground/5"
              aria-label="Cerrar"
            >
              <X className="size-4" />
            </button>
          </div>

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
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-accent hover:bg-accent/10"
              >
                <CheckCheck className="size-3.5" />
                Leer todas
              </button>
            )}
          </div>

          <ul className="max-h-80 overflow-y-auto overscroll-contain py-1">
            {visibleItems.length === 0 ? (
              <li className="px-4 py-10 text-center">
                <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-foreground/[0.04] text-muted">
                  <Check className="size-5" />
                </div>
                <p className="mt-3 text-sm font-medium text-card-foreground">
                  {filter === "unread"
                    ? "No tienes notificaciones sin leer"
                    : "No hay notificaciones"}
                </p>
                <p className="mt-1 text-xs text-muted">
                  Te avisaremos cuando haya novedades en el panel.
                </p>
              </li>
            ) : (
              visibleItems.map((item) => {
                const meta = TYPE_ICONS[item.type];
                const Icon = meta.icon;
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
                      className={cn(
                        "group relative flex cursor-pointer gap-3 px-4 py-3 transition-colors hover:bg-foreground/[0.03]",
                        !item.read && "bg-accent/[0.04]",
                      )}
                    >
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
                        <p className="mt-0.5 text-xs leading-relaxed text-muted">
                          {item.message}
                        </p>
                        <p className="mt-1 text-[11px] text-muted">{item.time}</p>
                      </div>
                      <div className="absolute right-2 top-2 flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                        {!item.read && (
                          <button
                            type="button"
                            onClick={(e) => {
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
                    </div>
                  </li>
                );
              })
            )}
          </ul>

        </div>
      )}
    </div>
  );
}
