"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { InactivityTimeoutDialog } from "@/components/auth/inactivity-timeout-dialog";
import { useAuth } from "@/context/auth-provider";
import {
  ACTIVITY_STORAGE_KEY,
  INACTIVITY_TIMEOUT_MS,
  INACTIVITY_WARNING_SECONDS,
  getInactivityStatus,
  recordLastActivity,
  warningSecondsRemaining,
} from "@/lib/inactivity-timeout";

const ACTIVITY_EVENTS = [
  "pointerdown",
  "keydown",
  "mousedown",
  "touchstart",
  "scroll",
] as const;

export function InactivityTimeoutProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { user, isLoading, logout } = useAuth();
  const active = Boolean(user) && !isLoading;

  const [warningOpen, setWarningOpen] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(INACTIVITY_WARNING_SECONDS);

  const warningOpenRef = useRef(false);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const warningDeadlineRef = useRef<number | null>(null);
  const lastRecordTimeRef = useRef<number>(0);
  const logoutRef = useRef(logout);

  useEffect(() => {
    logoutRef.current = logout;
  }, [logout]);

  const clearIdleTimer = useCallback(() => {
    if (idleTimerRef.current !== null) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  }, []);

  const clearCountdownTimer = useCallback(() => {
    if (countdownTimerRef.current !== null) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
  }, []);

  const clearAllTimers = useCallback(() => {
    clearIdleTimer();
    clearCountdownTimer();
    warningDeadlineRef.current = null;
  }, [clearCountdownTimer, clearIdleTimer]);

  const closeWarning = useCallback(() => {
    if (!warningOpenRef.current) {
      clearCountdownTimer();
      warningDeadlineRef.current = null;
      return;
    }
    warningOpenRef.current = false;
    setWarningOpen(false);
    setSecondsLeft(INACTIVITY_WARNING_SECONDS);
    clearCountdownTimer();
    warningDeadlineRef.current = null;
  }, [clearCountdownTimer]);

  const startCountdown = useCallback(
    (initialSeconds?: number) => {
      clearCountdownTimer();
      const sec =
        typeof initialSeconds === "number" && initialSeconds > 0
          ? initialSeconds
          : INACTIVITY_WARNING_SECONDS;
      const deadline = Date.now() + sec * 1000;
      warningDeadlineRef.current = deadline;
      setSecondsLeft(sec);
      warningOpenRef.current = true;
      setWarningOpen(true);

      countdownTimerRef.current = setInterval(() => {
        const currentDeadline = warningDeadlineRef.current;
        if (!currentDeadline) return;

        const remaining = warningSecondsRemaining(currentDeadline, Date.now());
        setSecondsLeft(remaining);
        if (remaining <= 0) {
          clearAllTimers();
          warningOpenRef.current = false;
          setWarningOpen(false);
          logoutRef.current();
        }
      }, 1000);
    },
    [clearAllTimers, clearCountdownTimer],
  );

  const scheduleIdle = useCallback(
    (delayMs: number = INACTIVITY_TIMEOUT_MS) => {
      clearIdleTimer();
      idleTimerRef.current = setTimeout(() => {
        startCountdown();
      }, Math.max(0, delayMs));
    },
    [clearIdleTimer, startCountdown],
  );

  const resetIdleTimer = useCallback(
    (forceRecord = false) => {
      if (!active) return;

      closeWarning();
      clearIdleTimer();

      const now = Date.now();
      if (forceRecord || now - lastRecordTimeRef.current >= 1000) {
        recordLastActivity(now);
        lastRecordTimeRef.current = now;
      }

      scheduleIdle(INACTIVITY_TIMEOUT_MS);
    },
    [active, clearIdleTimer, closeWarning, scheduleIdle],
  );

  const evaluateInactivity = useCallback(() => {
    if (!active) return;

    const status = getInactivityStatus();

    if (status.isExpired) {
      clearAllTimers();
      closeWarning();
      logoutRef.current();
      return;
    }

    if (status.isInWarning) {
      clearIdleTimer();
      if (!warningOpenRef.current) {
        startCountdown(status.warningSecondsLeft);
      }
      return;
    }

    if (status.lastActivity === null) {
      resetIdleTimer(true);
    } else {
      closeWarning();
      scheduleIdle(status.remainingIdleMs);
    }
  }, [
    active,
    clearAllTimers,
    clearIdleTimer,
    closeWarning,
    resetIdleTimer,
    scheduleIdle,
    startCountdown,
  ]);

  const handleStayConnected = useCallback(() => {
    resetIdleTimer(true);
  }, [resetIdleTimer]);

  useEffect(() => {
    if (!active) {
      clearAllTimers();
      if (warningOpenRef.current) {
        closeWarning();
      }
      return;
    }

    const onActivity = () => {
      if (warningOpenRef.current) return;
      resetIdleTimer();
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key !== ACTIVITY_STORAGE_KEY) return;
      if (!event.newValue) {
        clearAllTimers();
        closeWarning();
        logoutRef.current();
        return;
      }
      evaluateInactivity();
    };

    const onVisibilityOrFocus = () => {
      evaluateInactivity();
    };

    for (const eventName of ACTIVITY_EVENTS) {
      window.addEventListener(eventName, onActivity, { passive: true });
    }
    window.addEventListener("storage", onStorage);
    window.addEventListener("visibilitychange", onVisibilityOrFocus);
    window.addEventListener("focus", onVisibilityOrFocus);

    evaluateInactivity();

    return () => {
      for (const eventName of ACTIVITY_EVENTS) {
        window.removeEventListener(eventName, onActivity);
      }
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("visibilitychange", onVisibilityOrFocus);
      window.removeEventListener("focus", onVisibilityOrFocus);
      clearAllTimers();
      if (warningOpenRef.current) {
        closeWarning();
      }
    };
  }, [active, clearAllTimers, closeWarning, evaluateInactivity, resetIdleTimer]);

  return (
    <>
      {children}
      <InactivityTimeoutDialog
        open={active && warningOpen}
        secondsLeft={secondsLeft}
        onStayConnected={handleStayConnected}
      />
    </>
  );
}
