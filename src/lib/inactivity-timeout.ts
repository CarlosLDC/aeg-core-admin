export const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000;
export const INACTIVITY_WARNING_MS = 60 * 1000;
export const TOTAL_INACTIVITY_TIMEOUT_MS =
  INACTIVITY_TIMEOUT_MS + INACTIVITY_WARNING_MS;
export const INACTIVITY_WARNING_SECONDS = INACTIVITY_WARNING_MS / 1000;
export const ACTIVITY_STORAGE_KEY = "aeg_last_activity";
export const ACTIVITY_COOKIE_NAME = "aeg_last_activity";

export function warningSecondsRemaining(
  deadlineMs: number,
  nowMs: number,
): number {
  return Math.max(0, Math.ceil((deadlineMs - nowMs) / 1000));
}

function getCookieValue(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function getLastActivityTimestamp(): number | null {
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(ACTIVITY_STORAGE_KEY);
      if (raw) {
        const parsed = Number(raw);
        if (Number.isFinite(parsed) && parsed > 0) return parsed;
      }
    } catch {
      // Ignorar fallo de acceso a localStorage
    }
  }

  const cookieVal = getCookieValue(ACTIVITY_COOKIE_NAME);
  if (cookieVal) {
    const parsed = Number(cookieVal);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }

  return null;
}

export function recordLastActivity(timestamp: number = Date.now()): void {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(ACTIVITY_STORAGE_KEY, String(timestamp));
    } catch {
      // Ignorar fallo de acceso a localStorage
    }
  }

  if (typeof document !== "undefined") {
    const secure =
      typeof window !== "undefined" && window.location.protocol === "https:"
        ? "; Secure"
        : "";
    document.cookie = `${ACTIVITY_COOKIE_NAME}=${timestamp}; Path=/; Max-Age=2592000; SameSite=Lax${secure}`;
  }
}

export function clearLastActivity(): void {
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem(ACTIVITY_STORAGE_KEY);
    } catch {
      // Ignorar fallo
    }
  }

  if (typeof document !== "undefined") {
    document.cookie = `${ACTIVITY_COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax`;
  }
}

export type InactivityStatus = {
  isExpired: boolean;
  isInWarning: boolean;
  warningSecondsLeft: number;
  remainingIdleMs: number;
  lastActivity: number | null;
};

export function getInactivityStatus(
  nowMs: number = Date.now(),
  lastActivity: number | null = getLastActivityTimestamp(),
): InactivityStatus {
  if (lastActivity === null) {
    return {
      isExpired: false,
      isInWarning: false,
      warningSecondsLeft: 0,
      remainingIdleMs: INACTIVITY_TIMEOUT_MS,
      lastActivity: null,
    };
  }

  const elapsed = Math.max(0, nowMs - lastActivity);

  if (elapsed >= TOTAL_INACTIVITY_TIMEOUT_MS) {
    return {
      isExpired: true,
      isInWarning: false,
      warningSecondsLeft: 0,
      remainingIdleMs: 0,
      lastActivity,
    };
  }

  if (elapsed >= INACTIVITY_TIMEOUT_MS) {
    const remainingWarningMs = Math.max(0, TOTAL_INACTIVITY_TIMEOUT_MS - elapsed);
    const warningSecondsLeft = Math.max(1, Math.ceil(remainingWarningMs / 1000));
    return {
      isExpired: false,
      isInWarning: true,
      warningSecondsLeft,
      remainingIdleMs: 0,
      lastActivity,
    };
  }

  return {
    isExpired: false,
    isInWarning: false,
    warningSecondsLeft: 0,
    remainingIdleMs: INACTIVITY_TIMEOUT_MS - elapsed,
    lastActivity,
  };
}

export function isSessionExpiredByInactivity(
  nowMs: number = Date.now(),
): boolean {
  return getInactivityStatus(nowMs).isExpired;
}
