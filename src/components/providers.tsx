"use client";

import { AuthProvider } from "@/context/auth-provider";
import { CompanyScopeProvider } from "@/context/company-scope-provider";
import { NotificationsProvider } from "@/context/notifications-provider";
import { ToastProvider } from "@/context/toast-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <CompanyScopeProvider>
        <NotificationsProvider>
          <ToastProvider>{children}</ToastProvider>
        </NotificationsProvider>
      </CompanyScopeProvider>
    </AuthProvider>
  );
}
