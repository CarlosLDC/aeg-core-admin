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
  INACTIVITY_WARNING_MS,
  INACTIVITY_WARNING_SECONDS,
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
  const logoutRef = useRef(logout);
  logoutRef.current = logout;

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
    warningOpenRef.current = false;
    setWarningOpen(false);
    setSecondsLeft(INACTIVITY_WARNING_SECONDS);
    clearCountdownTimer();
    warningDeadlineRef.current = null;
  }, [clearCountdownTimer]);

  const startCountdown = useCallback(() => {
    clearCountdownTimer();
    const deadline = Date.now() + INACTIVITY_WARNING_MS;
    warningDeadlineRef.current = deadline;
    setSecondsLeft(INACTIVITY_WARNING_SECONDS);
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
  }, [clearAllTimers, clearCountdownTimer]);

  const resetIdleTimer = useCallback(() => {
    if (!active) return;

    closeWarning();
    clearIdleTimer();
    localStorage.setItem(ACTIVITY_STORAGE_KEY, String(Date.now()));

    idleTimerRef.current = setTimeout(() => {
      startCountdown();
    }, INACTIVITY_TIMEOUT_MS);
  }, [active, clearIdleTimer, closeWarning, startCountdown]);

  useEffect(() => {
    if (!active) {
      clearAllTimers();
      closeWarning();
      return;
    }

    const onActivity = () => {
      if (warningOpenRef.current) return;
      resetIdleTimer();
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key !== ACTIVITY_STORAGE_KEY || !event.newValue) return;
      if (warningOpenRef.current) return;
      resetIdleTimer();
    };

    for (const eventName of ACTIVITY_EVENTS) {
      window.addEventListener(eventName, onActivity, { passive: true });
    }
    window.addEventListener("storage", onStorage);
    resetIdleTimer();

    return () => {
      for (const eventName of ACTIVITY_EVENTS) {
        window.removeEventListener(eventName, onActivity);
      }
      window.removeEventListener("storage", onStorage);
      clearAllTimers();
      closeWarning();
    };
  }, [active, clearAllTimers, closeWarning, resetIdleTimer]);

  return (
    <>
      {children}
      <InactivityTimeoutDialog
        open={warningOpen}
        secondsLeft={secondsLeft}
        onStayConnected={resetIdleTimer}
      />
    </>
  );
}
