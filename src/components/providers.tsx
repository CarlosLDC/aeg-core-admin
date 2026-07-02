"use client";

import { AuthProvider } from "@/context/auth-provider";
import { CompanyScopeProvider } from "@/context/company-scope-provider";
import { ConfirmProvider } from "@/context/confirm-provider";
import { InactivityTimeoutProvider } from "@/context/inactivity-timeout-provider";
import { NotificationsProvider } from "@/context/notifications-provider";
import { ThemeProvider } from "@/context/theme-provider";
import { SentryInit } from "@/components/sentry-init";
import { ToastProvider } from "@/context/toast-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <SentryInit />
      <AuthProvider>
        <InactivityTimeoutProvider>
          <CompanyScopeProvider>
            <NotificationsProvider>
              <ConfirmProvider>
                <ToastProvider>{children}</ToastProvider>
              </ConfirmProvider>
            </NotificationsProvider>
          </CompanyScopeProvider>
        </InactivityTimeoutProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
