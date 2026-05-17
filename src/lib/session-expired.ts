import { clearUserProfile } from "@/lib/auth-profile";
import { clearStoredToken } from "@/lib/auth-storage";
import { clearSessionCookie } from "@/lib/session-cookie";
import { getSafeRedirectPath } from "@/lib/safe-redirect";

export function clearSession() {
  clearStoredToken();
  clearUserProfile();
  clearSessionCookie();
}

/** Cierra sesión local y redirige al login (solo en navegador). */
export function redirectToLoginAfterExpired() {
  if (typeof window === "undefined") return;
  clearSession();
  const redirect = encodeURIComponent(
    window.location.pathname + window.location.search,
  );
  window.location.href = `/login?redirect=${redirect}`;
}

export function redirectToLoginWithPath(path: string) {
  if (typeof window === "undefined") return;
  const safe = getSafeRedirectPath(path);
  window.location.href = `/login?redirect=${encodeURIComponent(safe)}`;
}
