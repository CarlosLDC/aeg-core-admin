export const DEFAULT_POLL_INTERVAL_MS = 30_000;
export const DEFAULT_RETRY_DELAYS_MS = [1_500, 4_000] as const;

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
