"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme, type ThemePreference } from "@/context/theme-provider";
import { cn } from "@/lib/utils";

const OPTIONS: { value: ThemePreference; label: string; Icon: typeof Sun }[] = [
  { value: "light", label: "Claro", Icon: Sun },
  { value: "dark", label: "Oscuro", Icon: Moon },
  { value: "system", label: "Sistema", Icon: Monitor },
];

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div
      className="flex items-center rounded-lg border border-border bg-card p-0.5"
      role="group"
      aria-label="Tema de la interfaz"
    >
      {OPTIONS.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          onClick={() => setTheme(value)}
          title={label}
          aria-pressed={theme === value}
          className={cn(
            "rounded-md p-2 text-muted transition-colors",
            theme === value && "bg-foreground/10 text-foreground",
          )}
        >
          <Icon className="size-4" aria-hidden />
          <span className="sr-only">{label}</span>
        </button>
      ))}
    </div>
  );
}
