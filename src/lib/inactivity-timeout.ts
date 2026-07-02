export const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000;
export const INACTIVITY_WARNING_MS = 60 * 1000;
export const INACTIVITY_WARNING_SECONDS = INACTIVITY_WARNING_MS / 1000;
export const ACTIVITY_STORAGE_KEY = "aeg_last_activity";

export function warningSecondsRemaining(
  deadlineMs: number,
  nowMs: number,
): number {
  return Math.max(0, Math.ceil((deadlineMs - nowMs) / 1000));
}
