"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  User,
} from "lucide-react";
import { LoginAnimatedBackdrop } from "@/components/auth/login-animated-backdrop";
import { BrandLogo } from "@/components/brand/logo";
import { getLoginErrorMessage, useAuth } from "@/context/auth-provider";
import { getSession } from "@/lib/auth";
import { isRemembered } from "@/lib/auth-storage";
import { completeSeniatHandoffFromAdmin } from "@/lib/fiscal-books-handoff";
import {
  FISCAL_BOOK_ENTRY_PATH,
  getSafeRedirectPath,
  postLoginRedirectPath,
} from "@/lib/safe-redirect";
import { FieldLabel } from "@/components/ui/field-label";
import { cn } from "@/lib/utils";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading, login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const redirectParam = searchParams.get("redirect");

  function handoffSeniatSession() {
    const session = getSession();
    if (!session || session.role !== "SENIAT") return false;

    completeSeniatHandoffFromAdmin({
      token: session.token,
      remember: isRemembered(),
      adminPath: getSafeRedirectPath(redirectParam, FISCAL_BOOK_ENTRY_PATH),
    });
    return true;
  }

  useEffect(() => {
    if (!isLoading && user?.role === "SENIAT") {
      handoffSeniatSession();
      return;
    }
    if (!isLoading && user) {
      router.replace(postLoginRedirectPath(user.role, redirectParam));
    }
  }, [isLoading, user, router, redirectParam]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await login({ username: username.trim(), password }, remember);
      if (handoffSeniatSession()) return;
      const session = getSession();
      if (session) {
        router.replace(postLoginRedirectPath(session.role, redirectParam));
      }
    } catch (err) {
      setError(getLoginErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading || user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-login-panel">
        <Loader2 className="size-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-login-panel">
      <div className="relative hidden flex-1 flex-col justify-between overflow-hidden p-10 text-sidebar-foreground lg:flex">
        <LoginAnimatedBackdrop />
        <div className="relative z-10">
          <BrandLogo variant="full" onDark href={null} priority />
        </div>
        <div className="relative z-10 max-w-md">
          <h1 className="text-3xl font-semibold tracking-tight text-sidebar-foreground drop-shadow-sm">
            El centro de mando de tu red fiscal
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-sidebar-muted">
            Visibilidad total sobre impresoras, empresas y equipos en campo.
            Menos fricción, más control — todo en un panel pensado para equipos
            que no se detienen.
          </p>
        </div>
        <p className="relative z-10 text-sm font-medium text-sidebar-foreground/90">
          Operaciones conectadas. Decisiones más rápidas.
        </p>
      </div>

      <div className="flex flex-1 items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md">
          <div className="mb-8 flex flex-col items-center lg:hidden">
            <BrandLogo variant="full" href={null} className="h-12" />
            <h2 className="mt-4 text-center text-2xl font-semibold tracking-tight">
              Bienvenido de nuevo
            </h2>
            <p className="mt-2 text-center text-sm text-muted">
              Tu panel te espera. Un acceso y sigues donde lo dejaste.
            </p>
          </div>

          <div className="hidden lg:block">
            <h2 className="text-2xl font-semibold tracking-tight">
              Bienvenido de nuevo
            </h2>
            <p className="mt-2 text-sm text-muted">
              Un acceso y vuelves al mando de tu operación.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            {error && (
              <div
                role="alert"
                className="flex items-start gap-3 rounded-lg border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300"
              >
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <label className="block">
              <FieldLabel>Usuario</FieldLabel>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
                <input
                  type="text"
                  name="username"
                  autoComplete="username"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full rounded-lg border border-border/80 bg-login-field py-2.5 pl-10 pr-4 text-sm outline-none transition-shadow focus:border-accent focus:ring-2 focus:ring-ring/20"
                  placeholder="tu.usuario@empresa.com"
                />
              </div>
            </label>

            <label className="block">
              <FieldLabel>Contraseña</FieldLabel>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-border/80 bg-login-field py-2.5 pl-10 pr-11 text-sm outline-none transition-shadow focus:border-accent focus:ring-2 focus:ring-ring/20"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted transition-colors hover:bg-foreground/5 hover:text-foreground"
                  aria-label={
                    showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                  }
                  aria-pressed={showPassword}
                >
                  {showPassword ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>
            </label>

            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="size-4 rounded border-border accent-accent"
              />
              <span className="text-muted">Recordar sesión en este equipo</span>
            </label>

            <button
              type="submit"
              disabled={submitting}
              className={cn(
                "flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-foreground transition-opacity",
                submitting && "cursor-not-allowed opacity-70",
              )}
            >
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                "Acceder al panel"
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-muted">
            Impresoras, empresas y servicios en campo — un solo lugar para
            hacer crecer tu operación.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-login-panel">
          <Loader2 className="size-8 animate-spin text-accent" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
