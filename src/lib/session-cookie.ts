const SESSION_COOKIE = "aeg_session";
const MAX_AGE_REMEMBER = 60 * 60 * 24 * 30;
const MAX_AGE_SESSION = 60 * 60 * 24;

export function setSessionCookie(remember: boolean) {
  if (typeof document === "undefined") return;
  const maxAge = remember ? MAX_AGE_REMEMBER : MAX_AGE_SESSION;
  const secure =
    typeof window !== "undefined" && window.location.protocol === "https:"
      ? "; Secure"
      : "";
  document.cookie = `${SESSION_COOKIE}=1; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
}

export function clearSessionCookie() {
  if (typeof document === "undefined") return;
  document.cookie = `${SESSION_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}

export function getSessionCookieName() {
  return SESSION_COOKIE;
}
