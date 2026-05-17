const STORAGE_PREFIX = "aeg-notifications";

export type NotificationPrefs = {
  readIds: string[];
  dismissedIds: string[];
  /** ISO: eventos anteriores a esta fecha se consideran ya vistos. */
  lastSeenAt: string | null;
};

function storageKey(username: string): string {
  return `${STORAGE_PREFIX}:${username}`;
}

const EMPTY: NotificationPrefs = {
  readIds: [],
  dismissedIds: [],
  lastSeenAt: null,
};

export function loadNotificationPrefs(username: string): NotificationPrefs {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = localStorage.getItem(storageKey(username));
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<NotificationPrefs>;
    return {
      readIds: Array.isArray(parsed.readIds) ? parsed.readIds : [],
      dismissedIds: Array.isArray(parsed.dismissedIds)
        ? parsed.dismissedIds
        : [],
      lastSeenAt:
        typeof parsed.lastSeenAt === "string" ? parsed.lastSeenAt : null,
    };
  } catch {
    return EMPTY;
  }
}

export function saveNotificationPrefs(
  username: string,
  prefs: NotificationPrefs,
): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(storageKey(username), JSON.stringify(prefs));
}
