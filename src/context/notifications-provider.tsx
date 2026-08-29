"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAuth } from "@/context/auth-provider";
import { useCompanyScope } from "@/context/company-scope-provider";
import { fetchAuthMe } from "@/lib/auth-me-api";
import {
  loadNotifications,
  toDisplayTime,
  withReadState,
} from "@/lib/notifications-data";
import {
  loadNotificationPrefs,
  saveNotificationPrefs,
  type NotificationPrefs,
} from "@/lib/notifications-storage";
import type { AppNotification } from "@/types/notification";
import { isDistributorPanelRole } from "@/types/user";

const POLL_MS = 90_000;

export type NotificationView = AppNotification & {
  read: boolean;
  time: string;
};

type NotificationsContextValue = {
  items: NotificationView[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  markRead: (id: string) => void;
  markAllRead: () => void;
  dismiss: (id: string) => void;
  dismissAll: () => void;
  acknowledgeSeen: () => void;
};

const NotificationsContext = createContext<NotificationsContextValue | null>(
  null,
);

export function NotificationsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const { scope, loading: scopeLoading } = useCompanyScope();
  const [rawItems, setRawItems] = useState<AppNotification[]>([]);
  const [prefs, setPrefs] = useState(() =>
    user
      ? loadNotificationPrefs(user.username)
      : { readIds: [], dismissedIds: [], lastSeenAt: null },
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [distributorId, setDistributorId] = useState<number | null>(
    user?.distributorId ?? null,
  );

  useEffect(() => {
    if (!user) return;
    setPrefs(loadNotificationPrefs(user.username));
  }, [user?.username]);

  useEffect(() => {
    if (!isDistributorPanelRole(user?.role)) {
      setDistributorId(user?.distributorId ?? null);
      return;
    }
    if (user.distributorId != null) {
      setDistributorId(user.distributorId);
      return;
    }
    let cancelled = false;
    fetchAuthMe()
      .then((me) => {
        if (!cancelled) setDistributorId(me.distributorId ?? null);
      })
      .catch(() => {
        if (!cancelled) setDistributorId(null);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.role, user?.distributorId]);

  const persistPrefs = useCallback(
    (next: NotificationPrefs) => {
      if (!user) return;
      setPrefs(next);
      saveNotificationPrefs(user.username, next);
    },
    [user],
  );

  const refresh = useCallback(async () => {
    if (!user || scopeLoading) return;
    setLoading(true);
    setError(null);
    try {
      const { notifications, warnings } = await loadNotifications({
        role: user.role,
        username: user.username,
        scope,
        distributorId,
        userBranchId: user.branchId,
      });
      setRawItems(notifications);
      if (warnings.length > 0 && notifications.length === 0) {
        setError(warnings.join(" "));
      }
    } catch {
      setRawItems([]);
      setError("No se pudieron cargar las notificaciones.");
    } finally {
      setLoading(false);
    }
  }, [user, scope, scopeLoading, distributorId]);

  useEffect(() => {
    if (!user || scopeLoading) return;
    void refresh();
  }, [user, scopeLoading, refresh]);

  useEffect(() => {
    if (!user) return;
    const id = window.setInterval(() => void refresh(), POLL_MS);
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [user, refresh]);

  const readSet = useMemo(() => new Set(prefs.readIds), [prefs.readIds]);
  const dismissedSet = useMemo(
    () => new Set(prefs.dismissedIds),
    [prefs.dismissedIds],
  );

  const items = useMemo((): NotificationView[] => {
    return withReadState(rawItems, {
      readIds: readSet,
      dismissedIds: dismissedSet,
      lastSeenAt: prefs.lastSeenAt,
    }).map((n) => ({
      ...n,
      time: toDisplayTime(n.createdAt),
    }));
  }, [rawItems, readSet, dismissedSet, prefs.lastSeenAt]);

  const unreadCount = useMemo(
    () => items.filter((n) => !n.read).length,
    [items],
  );

  const markRead = useCallback(
    (id: string) => {
      if (readSet.has(id)) return;
      persistPrefs({
        ...prefs,
        readIds: [...prefs.readIds, id],
      });
    },
    [persistPrefs, prefs.dismissedIds, prefs.readIds, readSet],
  );

  const markAllRead = useCallback(() => {
    const ids = new Set(prefs.readIds);
    for (const item of items) {
      if (!item.read) ids.add(item.id);
    }
    persistPrefs({
      ...prefs,
      readIds: [...ids],
    });
  }, [items, persistPrefs, prefs]);

  const dismiss = useCallback(
    (id: string) => {
      const dismissed = new Set(prefs.dismissedIds);
      dismissed.add(id);
      persistPrefs({
        ...prefs,
        dismissedIds: [...dismissed],
      });
    },
    [persistPrefs, prefs],
  );

  const dismissAll = useCallback(() => {
    const dismissed = new Set(prefs.dismissedIds);
    for (const item of rawItems) {
      dismissed.add(item.id);
    }
    for (const item of items) {
      dismissed.add(item.id);
    }
    persistPrefs({
      ...prefs,
      dismissedIds: [...dismissed],
    });
  }, [items, persistPrefs, prefs, rawItems]);

  const acknowledgeSeen = useCallback(() => {
    persistPrefs({
      ...prefs,
      lastSeenAt: new Date().toISOString(),
    });
  }, [persistPrefs, prefs]);

  const value = useMemo(
    () => ({
      items,
      unreadCount,
      loading,
      error,
      refresh,
      markRead,
      markAllRead,
      dismiss,
      dismissAll,
      acknowledgeSeen,
    }),
    [
      items,
      unreadCount,
      loading,
      error,
      refresh,
      markRead,
      markAllRead,
      dismiss,
      dismissAll,
      acknowledgeSeen,
    ],
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications(): NotificationsContextValue {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error("useNotifications debe usarse dentro de NotificationsProvider");
  }
  return ctx;
}
