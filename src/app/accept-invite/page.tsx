"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
} from "lucide-react";
import { ThemeToggle } from "@/components/admin/theme-toggle";
import { AuthSplitShell } from "@/components/auth/auth-split-shell";
import { FieldLabel } from "@/components/ui/field-label";
import { RoleBadge } from "@/components/users/role-badge";
import { useAuth } from "@/context/auth-provider";
import { logout } from "@/lib/auth";
import {
  acceptInvitation,
  getAuthActionErrorMessage,
  validateInvitationToken,
  type InvitationValidationResponse,
} from "@/lib/auth-invitations-api";
import { completeSeniatHandoffFromAdmin } from "@/lib/fiscal-books-handoff";
import { postLoginRedirectPath } from "@/lib/safe-redirect";
import {
  MIN_SELF_SERVICE_PASSWORD_LENGTH,
  validateSelfServicePassword,
} from "@/lib/user-form";
import { cn } from "@/lib/utils";

type InviteValidationState =
  | { token: string; invite: InvitationValidationResponse; error: null }
  | { token: string; invite: null; error: string };

function AcceptInviteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loginWithToken } = useAuth();
  const token = searchParams.get("token")?.trim() ?? "";

  const [validation, setValidation] = useState<InviteValidationState | null>(
    null,
  );
  const validating = Boolean(token) && validation?.token !== token;
  const invite =
    token && validation?.token === token ? validation.invite : null;
  const tokenError = !token
    ? "El enlace de invitación no contiene un token válido. Solicita una nueva invitación al administrador."
    : validation?.token === token
      ? validation.error
      : null;

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [activated, setActivated] = useState(false);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    validateInvitationToken(token)
      .then((data) => {
        if (!cancelled) {
          setValidation({ token, invite: data, error: null });
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setValidation({
            token,
            invite: null,
            error: getAuthActionErrorMessage(err),
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);

    const passwordError = validateSelfServicePassword(
      password,
      confirmPassword,
    );
    if (passwordError) {
      setSubmitError(passwordError);
      return;
    }

    setSubmitting(true);
    try {
      const result = await acceptInvitation(token, password);
      setActivated(true);

      if (user) {
        logout();
      }
      await loginWithToken(result.token, true);

      if (result.role === "SENIAT") {
        completeSeniatHandoffFromAdmin({
          token: result.token,
          remember: true,
        });
        return;
      }

      router.replace(postLoginRedirectPath(result.role, null));
    } catch (err) {
      setActivated(false);
      setSubmitError(getAuthActionErrorMessage(err));
      setSubmitting(false);
    }
  }

  return (
    <AuthSplitShell
      title="Activa tu cuenta"
      subtitle="Define tu contraseña personal para acceder a la plataforma AEG."
    >
      {validating ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-8 text-center">
          <Loader2 className="size-7 animate-spin text-accent" />
          <p className="text-sm text-muted">Verificando tu invitación...</p>
        </div>
      ) : tokenError || !invite ? (
        <div className="space-y-4 rounded-xl border border-rose-500/20 bg-rose-500/10 p-6">
          <div className="flex items-start gap-3 text-sm text-rose-700 dark:text-rose-300">
            <AlertCircle className="mt-0.5 size-5 shrink-0" />
            <div className="space-y-1">
              <p className="font-semibold">Invitación no disponible</p>
              <p>{tokenError}</p>
            </div>
          </div>
          <Link
            href="/login"
            className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-accent px-4 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90"
          >
            Ir al inicio de sesión
          </Link>
        </div>
      ) : activated ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-8 text-center text-emerald-800 dark:text-emerald-200">
          <CheckCircle2 className="size-8 text-emerald-600 dark:text-emerald-400" />
          <p className="font-semibold">¡Cuenta activada!</p>
          <p className="text-sm">Redirigiendo a tu portal...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="rounded-xl border border-border bg-card p-4 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-card-foreground">
                {invite.name}
              </span>
              <RoleBadge role={invite.role} />
            </div>
            <p className="font-mono text-xs text-muted">{invite.email}</p>
          </div>

          {user && (
            <div
              role="status"
              className="flex items-start gap-2.5 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3.5 py-2.5 text-xs text-amber-800 dark:text-amber-200"
            >
              <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>
                Tienes una sesión activa ({user.email}). Al activar esta cuenta
                se reemplazará por la nueva sesión.
              </span>
            </div>
          )}

          {submitError && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-lg border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300"
            >
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          <label className="block">
            <FieldLabel required>Nueva contraseña</FieldLabel>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                autoComplete="new-password"
                required
                minLength={MIN_SELF_SERVICE_PASSWORD_LENGTH}
                disabled={submitting}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-10 w-full rounded-lg border border-border/80 bg-login-field pl-10 pr-11 text-sm outline-none transition-shadow focus:border-accent focus:ring-2 focus:ring-ring/20"
                placeholder={`Mínimo ${MIN_SELF_SERVICE_PASSWORD_LENGTH} caracteres`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted transition-colors hover:bg-foreground/5 hover:text-foreground"
                aria-label={
                  showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                }
              >
                {showPassword ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>
          </label>

          <label className="block">
            <FieldLabel required>Confirmar contraseña</FieldLabel>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
              <input
                type={showConfirm ? "text" : "password"}
                name="confirmPassword"
                autoComplete="new-password"
                required
                minLength={MIN_SELF_SERVICE_PASSWORD_LENGTH}
                disabled={submitting}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="h-10 w-full rounded-lg border border-border/80 bg-login-field pl-10 pr-11 text-sm outline-none transition-shadow focus:border-accent focus:ring-2 focus:ring-ring/20"
                placeholder="Repite tu contraseña"
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted transition-colors hover:bg-foreground/5 hover:text-foreground"
                aria-label={
                  showConfirm ? "Ocultar contraseña" : "Mostrar contraseña"
                }
              >
                {showConfirm ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>
          </label>

          <button
            type="submit"
            disabled={submitting}
            className={cn(
              "flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 text-sm font-medium text-accent-foreground transition-opacity",
              submitting && "cursor-not-allowed opacity-70",
            )}
          >
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Activando cuenta...
              </>
            ) : (
              "Activar cuenta y entrar"
            )}
          </button>

          <p className="text-center text-xs text-muted">
            ¿Ya activaste tu cuenta?{" "}
            <Link
              href="/login"
              className="font-medium text-accent underline-offset-2 hover:underline"
            >
              Inicia sesión
            </Link>
          </p>
        </form>
      )}
    </AuthSplitShell>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense
      fallback={
        <div className="relative flex min-h-screen items-center justify-center bg-login-panel">
          <div className="absolute top-4 right-4 z-20 sm:top-6 sm:right-6">
            <ThemeToggle />
          </div>
          <Loader2 className="size-8 animate-spin text-accent" />
        </div>
      }
    >
      <AcceptInviteContent />
    </Suspense>
  );
}
