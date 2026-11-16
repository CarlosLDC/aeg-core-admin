"use client";

import { cn } from "@/lib/utils";

export function wifiSignalLevel(signal: number): 0 | 1 | 2 | 3 | 4 {
  if (signal >= 0 && signal <= 100) {
    if (signal >= 80) return 4;
    if (signal >= 60) return 3;
    if (signal >= 40) return 2;
    if (signal >= 20) return 1;
    return 0;
  }

  if (signal >= -55) return 4;
  if (signal >= -65) return 3;
  if (signal >= -75) return 2;
  if (signal >= -85) return 1;
  return 0;
}

export function formatWifiSignalLabel(signal: number): string {
  if (signal >= 0 && signal <= 100) {
    return `Calidad de señal ${signal}%`;
  }

  return `Intensidad de señal ${signal} dBm`;
}

/**
 * Displays a 4-bar Wi-Fi signal strength meter from percentage or dBm RSSI.
 */
export function WifiSignalIndicator({
  signal,
  className,
}: {
  signal: number | null;
  className?: string;
}) {
  const level = signal != null ? wifiSignalLevel(signal) : 0;

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-end gap-0.5 text-sky-600 dark:text-sky-400",
        className,
      )}
      aria-label={
        signal != null ? formatWifiSignalLabel(signal) : "Señal desconocida"
      }
      title={
        signal != null
          ? signal >= 0 && signal <= 100
            ? `${signal}%`
            : `${signal} dBm`
          : undefined
      }
    >
      {[1, 2, 3, 4].map((bar) => (
        <span
          key={bar}
          className={cn(
            "w-1 rounded-sm bg-current",
            bar <= level ? "opacity-100" : "opacity-20",
          )}
          style={{ height: `${bar * 3 + 4}px` }}
          aria-hidden
        />
      ))}
    </span>
  );
}
